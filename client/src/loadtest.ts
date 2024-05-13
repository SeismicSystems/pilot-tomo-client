import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import axios from "axios";
import { hexToSignature } from "viem";

import {
    setUpContractInterfaces,
    handleAsync,
    sleep,
    clientInterfaceSetup,
    getDeployedAddress,
    matches,
    getSeismicAddress,
    swipe,
    upgradeContract
} from "./lib/utils";
import {
    abi as SwipeABI,
    bytecode as SwipeBytecode,
} from "../../contract/out/Swipe.sol/Swipe.json";

const SwipeBytecodeFormatted: `0x${string}` = `0x${SwipeBytecode.object.replace(/^0x/, "")}`;

async function runClientDemo(numWallets: number, threadNum: number, swipeContractAddress: `0x${string}`, walletClients: any[], contracts: any[]) {
    const startWalletIndex = numWallets * (threadNum - 1);
    const endWalletIndex = numWallets*threadNum - 1;

    const DEMO_CONFIG = {
        numWallets: numWallets,
        likes: [
            [startWalletIndex, startWalletIndex + 1],
            [startWalletIndex + 1, startWalletIndex],
            [startWalletIndex, startWalletIndex + 2],
            [startWalletIndex + 2, startWalletIndex],
            [startWalletIndex + 1, startWalletIndex + 2],
            [startWalletIndex + 2, startWalletIndex + 1],
            [startWalletIndex, startWalletIndex + 3],
            [startWalletIndex + 1, startWalletIndex + 4],
        ],
        dislikes: [[startWalletIndex + 3, startWalletIndex]],
    };

   

    console.log("== Simulating swipes");
    for (const [sender, recipient] of DEMO_CONFIG.likes) {
        const startTime = Date.now();
        try {
            await swipe(
                contracts[sender],
                walletClients[sender],
                walletClients[recipient],
                true,
            );
            const endTime = Date.now();
            console.log(`Swipe task completed in ${(endTime - startTime) / 1000}s`);
             // await sleep(10000);
        console.log(`- Registered "like" between [#${sender}, #${recipient}]`);
        } catch (error) {
            console.log(`Error during swipe operation`);
        }
       
    }
    for (const [sender, recipient] of DEMO_CONFIG.dislikes) {
        try {
            const startTime = Date.now();
            await swipe(
                contracts[sender],
                walletClients[sender],
                walletClients[recipient],
                false,
            );
            const endTime = Date.now();
            console.log(`Dislike task completed in ${endTime - startTime}ms`);
            // await sleep(10000);

            console.log(
                `- Registered "dislike" between [#${sender}, #${recipient}]`,
            );
        } catch (error) {
            console.log(`Error during dislike operation`);
        }
    }
    console.log("==");

    await sleep(15000);

    const displayWallet = startWalletIndex;
    console.log(`== Fetching matches for sample wallet ${displayWallet}`);
    console.log(await matches(walletClients[displayWallet]));
    console.log("==");

}

async function main() {

    const args = process.argv.slice(2);

    const numThreads = parseInt(args[0], 10);
    const numWalletsPerThread = parseInt(args[1], 10);

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
    console.log("Number of threads: ", numThreads);
    const [walletClients, publicClients, contracts] =
        await setUpContractInterfaces(
            numThreads,
            BigInt(`0x${process.env.DEV_PRIVKEY}`),
            numWalletsPerThread,
            swipeContractAddress,
        );
    for (const [index, walletClient] of walletClients.entries()) {
        console.log(
            `- Wallet #${index} address: ${walletClient.account.address}`,
        );
    }

    console.log("==");

    
    if (args.length !== 2) {
        console.error("Usage: ts-node loadtest.ts <numThreads> <numWalletsPerThread>");
        process.exit(1);
    }


    const promises = [];
    for (let i = 1; i <= numThreads; i++) {
        promises.push(runClientDemo(numWalletsPerThread, i, swipeContractAddress, walletClients, contracts));
    }

    await Promise.all(promises);
    console.log("All threads completed.");
}

main().catch((error) => {
    console.error("Error running load test:", error);
    process.exit(1);
});
