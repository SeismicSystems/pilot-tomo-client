import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import axios from "axios";
import { hexToSignature, recoverTypedDataAddress } from "viem";

import {
    setUpContractInterfaces,
    handleAsync,
    signTypedData,
    stringifyBigInts,
    sampleBlind,
    sleep,
    recoverTypedMessageAddress,
    clientInterfaceSetup,
    getDeployedAddress,
} from "./lib/utils";
import { swipeDAReqTyped, swipeMatchTyped } from "./lib/types";
//import { swipeContractAddress } from "../../contract/out/deploy.json";
import {
    abi as SwipeABI,
    bytecode as SwipeBytecode,
} from "../../contract/out/Swipe.sol/Swipe.json";
import { get } from "http";

const SwipeBytecodeFormatted: `0x${string}` = `0x${SwipeBytecode.object.replace(/^0x/, "")}`;

const DEMO_CONFIG = {
    // We use this many wallets for the demo.
    numWallets: 5,
    // Symmetric likes for [0, 1] && [0, 2] && [1, 2] should lead to matches.
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
    // Asymmetric likes for [0, 3] && [1, 4] should not lead to matches.
    dislikes: [[3, 0]],
};

/*
 * Seismic tracks a nonce for each wallet to avoid replay attacks. Note this is
 * NOT the nonce that Ethereum tracks for the wallet.
 */
async function nonce(walletClient: any) {
    const response = await axios.get(
        `${process.env.ENDPOINT}/authentication/nonce`,
        {
            data: {
                address: walletClient.account.address,
            },
        },
    );
    if (response.status !== 200) {
        throw new Error(
            "Could not get nonce for address",
            walletClient.account.address,
        );
    }
    return response.data.nonce;
}

/*
 * Seismic must be alerted of the intended swipe prior to posting it on-chain.
 * This is enforced via a data availability signaturew which is checked in the
 * contract.
 */
async function davail(
    walletClientSender: any,
    walletClientRecipient: any,
    positive: boolean,
): Promise<[string, string]> {
    const senderNonce = await nonce(walletClientSender);
    console.log("Sender is: " + walletClientSender.account.address);
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
        stringifyBigInts(tx),
    );
    console.log("The signature is: " + signature);
    console.log("The tx is: " + JSON.stringify(stringifyBigInts(tx)));
    console.log(
        "The recovered address is: " +
            (await recoverTypedMessageAddress(
                signature,
                swipeDAReqTyped.types,
                `${swipeDAReqTyped.label}Tx`,
                swipeDAReqTyped.domain,
                stringifyBigInts(tx),
            )),
    );

    const response = await axios.post(`${process.env.ENDPOINT}/swipe/davail`, {
        tx: stringifyBigInts(tx),
        signature: signature,
    });
    if (response.status !== 200) {
        throw new Error("Could not acquire data availability signature");
    }
    return [response.data.commitment, response.data.signature];
}

async function upgradeContract(newContractAddress: string): Promise<void> {
    const response = await axios.post(
        `${process.env.ENDPOINT}/swipe/upgradecontract`,
        {
            newContract: newContractAddress,
        },
    );
    if (response.status !== 200) {
        throw new Error("Could not upgrade contract");
    }
}

/*
 * Registers a swipe directly to the chain by sending the hiding commitment.
 * Note that though this requires a data availability signature from Seismic,
 * the user is registering the swipe themselves. Seismic is not acting on the
 * user's behalf.
 */
async function registerSwipe(
    contractSender: any,
    swipeCommitment: string,
    daSignature: string,
) {
    console.log("DA Signature: ", daSignature);

    const unpackedSig = hexToSignature(`0x${daSignature.substring(2)}`);
    const structuredSig = {
        v: unpackedSig.v,
        r: unpackedSig.r,
        s: unpackedSig.s,
        b: 0,
    };
    let [res, err] = await handleAsync(
        contractSender.write.swipe([
            BigInt(`0x${swipeCommitment}`),
            structuredSig.v,
            structuredSig.r,
            structuredSig.s,
        ]),
    );
    if (res === null || err) {
        throw new Error(`Error registering swipe: ${err}`);
    }
}

/*
 * Checks whether the matches provided by Seismic are true to what the user
 * registerd on-chain. Removes the trust assumption on Seismic for providing
 * honest swipes.
 *
 * Though state provenance is not the primary use-case of Tomo's blockchain
 * component (composability is), this is still a good step to do, especially
 * as more of Tomo's workflow transitions on-chain.
 */
async function verifyCounterpartySwipes(matches: any) {
    // [TODO]
}

/*
 * Fetches matches of a wallet from Seismic and checks whether they're
 * consistent with what's actually shown on-chain.
 */
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
        tx,
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
    await verifyCounterpartySwipes(response.data);
    return response.data;
}

/*
 * Having a "sender" swipe on a "recipient" requires the data availability
 * share with Seismic before going directly from the client to the chain.
 */
async function swipe(
    contractSender: any,
    walletClientSender: any,
    walletClientRecipient: any,
    positive: boolean,
) {
    const [swipeCommitment, daSignature] = await davail(
        walletClientSender,
        walletClientRecipient,
        positive,
    );
    registerSwipe(contractSender, swipeCommitment, daSignature);
}

async function getSeismicAddress(): Promise<`0x${string}`> {
    const response = await axios.get(
        `${process.env.ENDPOINT}/swipe/getseismicaddress`,
    );
    if (response.status !== 200) {
        throw new Error("Could not get Seismic address");
    }
    return response.data.seismicTomoContractAddress;
}

/*
 * Simulates wallet interactions specified in DEMO_CONFIG. Runs through the
 * Seismic flow for each swipe, then logs the matches that were confirmed
 * on-chain.
 */
async function runDemo() {
    const [walletClient, publicClient] = clientInterfaceSetup(
        process.env.WALLET1_PRIVKEY!,
    );

    const seismicAddress = await getSeismicAddress();

    console.log(seismicAddress);

    await walletClient.deployContract({
        abi: SwipeABI,
        bytecode: SwipeBytecodeFormatted,
        args: [seismicAddress],
    });

    const swipeContractAddress = await getDeployedAddress(
        publicClient,
        walletClient.account.address,
    );

    console.log("== Deployed contract at address: " + swipeContractAddress);

    await upgradeContract(swipeContractAddress);

    console.log("== Initializing demo wallets");
    const [walletClients, publicClients, contracts] =
        await setUpContractInterfaces(
            BigInt(`0x${process.env.WALLET1_PRIVKEY}`),
            DEMO_CONFIG.numWallets,
            swipeContractAddress,
        );
    for (const [index, walletClient] of walletClients.entries()) {
        console.log(
            `- Wallet #${index} address: ${walletClient.account.address}`,
        );
    }
    console.log("==");

    console.log("== Simulating swipes");
    for (const [sender, recipient] of DEMO_CONFIG.likes) {
        console.log("Sender is: " + walletClients[sender].account.address);
        console.log(
            "Recipient is: " + walletClients[recipient].account.address,
        );
        await swipe(
            contracts[sender],
            walletClients[sender],
            walletClients[recipient],
            true,
        );
        await sleep(10000);
        console.log(`- Registered "like" between [#${sender}, #${recipient}]`);
    }
    for (const [sender, recipient] of DEMO_CONFIG.dislikes) {
        await swipe(
            contracts[sender],
            walletClients[sender],
            walletClients[recipient],
            false,
        );
        await sleep(10000);

        console.log(
            `- Registerd "dislike" between [#${sender}, #${recipient}]`,
        );
    }
    console.log("==");

    // Give transactions time to confirm
    await sleep(15000);

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
