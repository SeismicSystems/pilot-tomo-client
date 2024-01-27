import {
    Address,
    createWalletClient,
    createPublicClient,
    getContract,
    http,
    parseAbiItem,
} from "viem";
import crypto from "crypto";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getMessage } from "eip-712";

import SwipeAPI from "../../../contract/out/Swipe.sol/Swipe.json" assert { type: "json" };
import deploy from "../../../contract/out/deploy.json" assert { type: "json" };

/*
 * ABIs for all events on the contract that we are interested in listening for.
 */
export const EventABIs = {
    RegisteredSwipe: parseAbiItem(
        "event RegisteredSwipe(address owner, uint256 commitment)"
    ),
};

/*
 * Sets up an interface with the Swipe contract using Viem.
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
 * Sets up multiple wallets and interfaces derived from a seed private key.
 * Also handles dripping these wallets with 1ETH each to pay for gas.
 */
export async function setUpContractInterfaces(
    seedPriv: BigInt,
    numWallets: number
): [any[], any[], any[]] {
    let walletClients: any[] = [],
        publicClients: any[] = [],
        contracts: any[] = [];

    for (let i = 0; i < numWallets; i++) {
        let freshPriv = seedPriv + BigInt(i);
        const [walletClient, publicClient, contract] = contractInterfaceSetup(
            freshPriv.toString(16)
        );
        walletClients.push(walletClient);
        publicClients.push(publicClient);
        contracts.push(contract);
        if (i > 0) {
            await walletClient.sendTransaction({
                account: walletClients[0].account,
                to: walletClients[i].account.address,
                value: 1000000000000000000n,
            });
        }
    }

    return [walletClients, publicClients, contracts];
}

/*
 * Sign typed data according to EIP712.
 */
export async function signTypedData(
    walletClient: any,
    account: PrivateKeyAccount,
    types: any,
    primaryType: string,
    domain: EIP712DomainType,
    message: any
): Promise<string> {
    const messageHash = hashTypedData(types, primaryType, domain, message);
    return walletClient.signMessage({
        account,
        message: messageHash,
    });
}

/*
 * Hash typed data according to EIP712.
 */
export function hashTypedData(
    types: EIP712Types,
    primaryType: string,
    domain: EIP712DomainType,
    message: any
): string {
    return uint8ArrayToHexString(
        getMessage(
            {
                types,
                primaryType,
                domain: domain as unknown as Record<string, unknown>,
                message,
            },
            true
        )
    );
}

/*
 * Samples a random 256 bit value. Uses cryptographically secure randomness.
 */
export function sampleBlind(): bigint {
    return BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
}

/*
 * Await this function to block execution for ms milliseconds.
 */
export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * Stringifies all BigInts in a nested object.
 */
export function stringifyBigInts(obj: any): any {
    if (typeof obj !== "object") {
        if (typeof obj === "bigint") {
            return obj.toString();
        }
        return obj;
    }
    const newObj = { ...obj };
    for (const key in newObj) {
        newObj[key] = stringifyBigInts(newObj[key]);
    }
    return newObj;
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

/*
 * Convert a uint8 array to a hex string.
 */
function uint8ArrayToHexString(byteArray: Uint8Array): string {
    return Array.from(byteArray, function (byte) {
        return ("0" + (byte & 0xff).toString(16)).slice(-2);
    }).join("");
}
