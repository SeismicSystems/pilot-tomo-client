import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import axios from "axios";
import { hexToSignature } from "viem";

import {
    setUpContractInterfaces,
    handleAsync,
    signTypedData,
    stringifyBigInts,
    sampleBlind,
    sleep,
} from "./lib/utils";
import { swipeDAReqTyped, swipeMatchTyped } from "./lib/types";

const DEMO_CONFIG = {
    numWallets: 5,
    // symmetric likes for [0, 1] && [0, 2] && [1, 2] should match
    likes: [
        [0, 1],
        [1, 0],
        [0, 2],
        [2, 0],
        [1, 2],
        [2, 1],
        [0, 3],
        [1, 4],
    ],
    // asymmetric likes for [0, 3] && [1, 4] should not match
    dislikes: [[3, 0]],
};

async function nonce(walletClient: any) {
    const response = await axios.get(
        `${process.env.ENDPOINT}/authentication/nonce`,
        {
            data: {
                address: walletClient.account.address,
            },
        }
    );
    if (response.status !== 200) {
        throw new Error(
            "Could not get nonce for address",
            walletClient.account.address
        );
    }
    return response.data.nonce;
}

async function davail(
    walletClientSender: any,
    walletClientRecipient: any,
    positive: boolean
): [string, string] {
    const senderNonce = await nonce(walletClientSender);
    const tx = {
        nonce: BigInt(senderNonce).toString(),
        body: {
            recipient: walletClientRecipient.account.address,
            positive: positive,
            blind: sampleBlind(),
        },
    };
    const signature = await signTypedData(
        walletClientSender,
        walletClientSender.account,
        swipeDAReqTyped.types,
        `${swipeDAReqTyped.label}Tx`,
        swipeDAReqTyped.domain,
        tx
    );
    const response = await axios.post(`${process.env.ENDPOINT}/swipe/davail`, {
        tx: stringifyBigInts(tx),
        signature,
    });
    if (response.status !== 200) {
        throw new Error("Could not acquire data availability signature");
    }
    return [response.data.commitment, response.data.signature];
}

async function registerSwipe(
    contractSender: any,
    swipeCommitment: string,
    daSignature: string
) {
    const unpackedSig = hexToSignature(daSignature);
    const structuredSig = {
        v: unpackedSig.v,
        r: unpackedSig.r,
        s: unpackedSig.s,
        b: 0,
    };
    let [res, err] = await handleAsync(
        contractSender.write.swipe([
            BigInt(`0x${swipeCommitment}`),
            structuredSig,
        ])
    );
    if (res === null || err) {
        throw new Error(`Error registering swipe: ${err}`);
    }
}

async function matches(walletClient: any) {
    const senderNonce = await nonce(walletClient);
    const tx = {
        nonce: BigInt(senderNonce).toString(),
        body: {
            startIndex: 0,
        },
    };
    const signature = await signTypedData(
        walletClient,
        walletClient.account,
        swipeMatchTyped.types,
        `${swipeMatchTyped.label}Tx`,
        swipeMatchTyped.domain,
        tx
    );
    const response = await axios.get(`${process.env.ENDPOINT}/swipe/matches`, {
        data: {
            tx: stringifyBigInts(tx),
            signature,
        },
    });
    if (response.status !== 200) {
        throw new Error("Could not request matches.");
    }
    return response.data;
}

async function swipe(
    contractSender: any,
    walletClientSender: any,
    walletClientRecipient: any,
    positive: boolean
) {
    const [swipeCommitment, daSignature] = await davail(
        walletClientSender,
        walletClientRecipient,
        positive
    );
    registerSwipe(contractSender, swipeCommitment, daSignature);
}

async function runDemo() {
    console.log("== Initializing demo wallets");
    const [walletClients, publicClients, contracts] =
        await setUpContractInterfaces(
            BigInt(`0x${process.env.WALLET1_PRIVKEY}`),
            DEMO_CONFIG.numWallets
        );
    for (const [index, walletClient] of walletClients.entries()) {
        console.log(
            `- Wallet #${index} address: ${walletClient.account.address}`
        );
    }
    console.log("==");

    console.log("== Simulating swipes");
    for (const [sender, recipient] of DEMO_CONFIG.likes) {
        await swipe(
            contracts[sender],
            walletClients[sender],
            walletClients[recipient],
            true
        );
        console.log(`- Registered "like" between [#${sender}, #${recipient}]`);
    }
    for (const [sender, recipient] of DEMO_CONFIG.dislikes) {
        await swipe(
            contracts[sender],
            walletClients[sender],
            walletClients[recipient],
            false
        );
        console.log(
            `- Registerd "dislike" between [#${sender}, #${recipient}]`
        );
    }
    console.log("==");

    // Give transactions time to confirm
    await sleep(2000);

    const displayWallet = 0;
    console.log(`== Fetching matches for sample wallet ${displayWallet}`);
    console.log(await matches(walletClients[displayWallet]));
    console.log("==");
}

(async () => {
    if (!process.env.WALLET1_PRIVKEY) {
        throw new Error("Please set demo privkey env variable.");
    }
    await runDemo();
})();
