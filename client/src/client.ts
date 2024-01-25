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
} from "./lib/utils";
import { swipeDAReqTyped } from "./lib/types";

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
            recipient: walletClientSender.account.address,
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
    console.log(hexToSignature(daSignature));

    let [res, err] = await handleAsync(
        contractSender.write.swipe([BigInt(`0x${swipeCommitment}`)])
    );
    if (!res || err) {
        throw new Error(`Error registering swipe: ${err}`);
    }
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

(async () => {
    if (!process.env.WALLET1_PRIVKEY) {
        throw new Error("Please set demo privkey env variable.");
    }

    const [walletClients, publicClients, contracts] = setUpContractInterfaces(
        BigInt(`0x${process.env.WALLET1_PRIVKEY}`),
        DEMO_CONFIG.numWallets
    );

    swipe(contracts[0], walletClients[0], walletClients[1], true);
})();
