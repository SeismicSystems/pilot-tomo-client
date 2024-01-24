import {
    Address,
    createWalletClient,
    createPublicClient,
    getContract,
    http,
    parseAbiItem,
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import SwipeAPI from "../../../contract/out/Swipe.sol/Swipe.json" assert { type: "json" };
import deploy from "../../../contract/out/deploy.json" assert { type: "json" };

export const EventABIs = {
    RegisteredSwipe: parseAbiItem("event RegisteredSwipe(uint256 commitment)"),
};

/*
 * Sets up a contract interface with Viem.
 */
export function contractInterfaceSetup(privKey: string): [any, any, any] {
    const account = privateKeyToAccount(`0x${privKey}`);
    const walletClient = createWalletClient({
        account,
        chain: foundry,
        transport: http(),
    });
    const publicClient = createPublicClient({
        chain: foundry,
        transport: http(),
    });
    const contract = getContract({
        abi: SwipeAPI.abi,
        address: deploy.swipeContractAddress as Address,
        walletClient,
        publicClient,
    });
    return [walletClient, publicClient, contract];
}

/*
 * Wrapper for error handling for promises.
 */
export async function handleAsync<T>(
    promise: Promise<T>
): Promise<[T, null] | [null, any]> {
    try {
        const data = await promise;
        return [data, null];
    } catch (error) {
        return [null, error];
    }
}
