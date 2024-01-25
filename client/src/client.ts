import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import axios from "axios";
import { hexToSignature } from "viem";

import {
    setUpContractInterfaces,
    handleAsync,
    signTypedData,
    stringifyBigInts,
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
        throw Exception(
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
            blind: BigInt(
                "0x218567f2b3067cb681590e3dc644fcfdc9e26020395bc80677ee270b95686d1d"
            ),
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
        throw Exception("Could not acquire data availability signature.");
    }
    return [response.data.commitment, response.data.signature];
}

async function swipe(
    walletClientSender: any,
    walletClientRecipient: any,
    positive: boolean
) {
    const [swipeCommitment, daSignature] = await davail(
        walletClientSender,
        walletClientRecipient,
        positive
    );
    console.log(swipeCommitment, daSignature);
}

(async () => {
    if (!process.env.WALLET1_PRIVKEY) {
        throw new Error("Please set demo privkey env variable.");
    }

    const [walletClients, publicClients, contracts] = setUpContractInterfaces(
        BigInt(`0x${process.env.WALLET1_PRIVKEY}`),
        DEMO_CONFIG.numWallets
    );

    swipe(walletClients[0], walletClients[1], true);

    // console.log(hexToSignature(signature));

    // return request(app.getServer())
    //     .post(`${swipeController.path}/davail`)
    //     .send({ tx: stringifyBigInts(tx), signature })
    //     .expect(200)
    //     .then(async (res) => {
    //         expect(
    //             await recoverTypedMessageAddress(
    //                 res.body.signature,
    //                 swipeDAResTyped.types,
    //                 swipeDAResTyped.label,
    //                 swipeDAResTyped.domain,
    //                 {
    //                     value: BigInt(`0x${res.body.commitment}`).toString(),
    //                 }
    //             )
    //         ).toEqual(`0x${process.env.SEQUENCER_ADDR}`);
    //     });

    // let [res, err] = await handleAsync(contract1.write.swipe(["2"]));
    // if (!res || err) {
    //     console.error("[ERROR] Could not register swipe: ", err);
    //     process.exit(1);
    // }
})();

// (async () => {
//   try {
//     const nonce = await getNonce("0xfff");
//     console.log("NONCE", nonce);
//   } catch (error) {
//     console.error(error);
//   }
// })();
