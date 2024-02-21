import {
    Address,
    createWalletClient,
    createPublicClient,
    getContract,
    http,
    parseAbiItem,
} from "viem";
import crypto from "crypto";
import { foundry, arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount, PrivateKeyAccount } from "viem/accounts";
import {
    keccak256,
    toHex,
    Hex,
    recoverMessageAddress,
    parseGwei,
    getContractAddress,
} from "viem";

import SwipeAPI from "../../../contract/out/Swipe.sol/Swipe.json" assert { type: "json" };
//import deploy from "../../../contract/out/deploy.json" assert { type: "json" };
import { EIP712Types, EIP712DomainType } from "./eip712.interface";

/*
 * ABIs for all events on the contract that we are interested in listening for.
 */
export const EventABIs = {
    RegisteredSwipe: parseAbiItem(
        "event RegisteredSwipe(address owner, uint256 commitment)",
    ),
};

/*
 * Sets up an interface with the Swipe contract using Viem.
 */
export function contractInterfaceSetup(
    privKey: string,
    address: Address,
): [any, any, any] {
    const chain =
        process.env.CHAIN === "arbitrum-sepolia" ? arbitrumSepolia : foundry;
    const account = privateKeyToAccount(`0x${privKey}`);
    const walletClient = createWalletClient({
        account,
        chain: chain,
        transport: http(process.env.RPC_URL),
    });
    const publicClient = createPublicClient({
        chain: chain,
        transport: http(process.env.RPC_URL),
    });
    const contract = getContract({
        abi: SwipeAPI.abi,
        address: address,
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
    seedPriv: bigint,
    numWallets: number,
    address: Address,
): Promise<[any[], any[], any[]]> {
    let walletClients: any[] = [],
        publicClients: any[] = [],
        contracts: any[] = [];

    for (let i = 0; i < numWallets; i++) {
        let freshPriv = seedPriv + BigInt(i);
        const [walletClient, publicClient, contract] = contractInterfaceSetup(
            freshPriv.toString(16),
            address,
        );
        walletClients.push(walletClient);
        publicClients.push(publicClient);
        contracts.push(contract);
        if (process.env.DRIP_ETH === "true") {
            if (i > 0) {
                await walletClient.sendTransaction({
                    account: walletClients[0].account,
                    to: walletClients[i].account.address,
                    value: 1000000000000000000n,
                });
                await sleep(5000);
            }
        }
    }

    return [walletClients, publicClients, contracts];
}

/*
 * Sign typed data
 */
export async function signTypedData(
    walletClient: any,
    account: PrivateKeyAccount,
    types: any,
    primaryType: string,
    domain: EIP712DomainType,
    message: any,
): Promise<string> {
    const messageHash = hashTypedData(types, primaryType, domain, message);
    const messageHex: Hex = `0x${messageHash}`;
    return walletClient.signMessage({
        account,
        message: { raw: messageHex as `0x${string}` },
    });
}

/*
 * Recovers the address of a signed message.
 */
export async function recoverTypedMessageAddress(
    signature: any,
    types: EIP712Types,
    primaryType: string,
    domain: EIP712DomainType,
    message: any,
): Promise<string> {
    const messageHash = hashTypedData(types, primaryType, domain, message);
    const messageHex: Hex = `0x${messageHash}`;
    return recoverMessageAddress({
        message: { raw: messageHex as `0x${string}` },
        signature,
    });
}

/*
 * Hashes typed data.
 */
export function hashTypedData(
    types: EIP712Types,
    primaryType: string,
    domain: EIP712DomainType,
    message: any,
): string {
    // Function to recursively stringify values
    function stringifyValue(value: any): string {
        if (typeof value === "bigint") {
            return value.toString();
        } else if (typeof value === "object" && value !== null) {
            if (Array.isArray(value)) {
                return `[${value.map(stringifyValue).join(",")}]`;
            } else {
                const sortedKeys = Object.keys(value).sort();
                return `{${sortedKeys.map((key) => `"${key}":${stringifyValue(value[key])}`).join(",")}}`;
            }
        } else {
            return JSON.stringify(value);
        }
    }

    // Hash the domain part
    const domainHash = keccak256(
        toHex(
            domain.name +
                "," +
                domain.version +
                "," +
                domain.chainId.toString() +
                "," +
                domain.verifyingContract,
        ),
    ).substring(2);

    // Convert the message to a string, handling nested objects and arrays
    const messageString = stringifyValue(message);
    const messageHash = keccak256(toHex(messageString)).substring(2);

    // Return the final hash
    return keccak256(`0x${domainHash}${messageHash}`).substring(2);
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
 * Recursively stringifies any BigInts present in a nested object.
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
    promise: Promise<T>,
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

/*
 * Set up a wallet client for the user.
 */

export function clientInterfaceSetup(privKey: string): [any, any] {
    const chain =
        process.env.CHAIN === "arbitrum-sepolia" ? arbitrumSepolia : foundry;
    const account = privateKeyToAccount(`0x${privKey}`);
    const walletClient = createWalletClient({
        account,
        chain: chain,
        transport: http(process.env.RPC_URL),
    });
    const publicClient = createPublicClient({
        chain: chain,
        transport: http(process.env.RPC_URL),
    });
    return [walletClient, publicClient];
}

/*
 * Returns the address of the contract that was deployed by the wallet client.
 */
export async function getDeployedAddress(
    publicClient: any,
    address: `0x${string}`,
): Promise<`0x${string}`> {
    const nonce = BigInt(
        await publicClient.getTransactionCount({
            address: address,
        }),
    );

    const deployedAddress = getContractAddress({
        from: address,
        nonce: nonce - BigInt(1),
    });

    return deployedAddress;
}
