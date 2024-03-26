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
    clientInterfaceSetup,
    getDeployedAddress,
    upgradeContract,
    getSeismicAddress,
    swipe,
    matches,

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
 * Simulates wallet interactions specified in DEMO_CONFIG. Runs through the
 * Seismic flow for each swipe, then logs the matches that were confirmed
 * on-chain.
 */
async function runDemo() {
    const [walletClient, publicClient] = clientInterfaceSetup(
        process.env.DEV_PRIVKEY!,
    );

    const seismicAddress = await getSeismicAddress();

    await walletClient.deployContract({
        abi: SwipeABI,
        bytecode: SwipeBytecodeFormatted,
        args: [seismicAddress],
    });

    const swipeContractAddress = await getDeployedAddress(
        publicClient,
        walletClient.account.address,
    );

    console.log("== Deploying Swipe contract");
    console.log("- Address:", swipeContractAddress);
    console.log("==");

    await upgradeContract(swipeContractAddress);

    console.log("== Initializing demo wallets");
    const [walletClients, publicClients, contracts] =
        await setUpContractInterfaces(
            1,
            BigInt(`0x${process.env.DEV_PRIVKEY}`),
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
            `- Registered "dislike" between [#${sender}, #${recipient}]`,
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
    if (!process.env.DEV_PRIVKEY) {
        throw new Error("Please set demo privkey env variable.");
    }
    await runDemo();
})();
