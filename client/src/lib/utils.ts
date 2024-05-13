import {
    Address,
    createWalletClient,
    createPublicClient,
    getContract,
    http,
    webSocket,
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
    getContractAddress,
    hexToSignature
} from "viem";
import axios from "axios";

import SwipeAPI from "../../../contract/out/Swipe.sol/Swipe.json" assert { type: "json" };
import { EIP712Types, EIP712DomainType } from "./eip712.interface";
import { swipeDAReqTyped, swipeMatchTyped } from "./types";

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
    mode: string,
): [any, any, any] {
    const chain =
        process.env.CHAIN === "arbitrum-sepolia" ? arbitrumSepolia : foundry;
    const account = privateKeyToAccount(`0x${privKey}`);
    const walletClient = createWalletClient({
        account,
        chain: chain,
        transport: http(process.env.RPC_URL),
    });
    const transportMode = mode === "websocket" ? webSocket(process.env.RPC_URL_WSS) : http(process.env.RPC_URL);
    const publicClient = createPublicClient({
        chain: chain,
        transport: transportMode,
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
    threadNum: number,
    seedPriv: bigint,
    numWallets: number,
    address: Address,
): Promise<[any[], any[], any[]]> {
    let walletClients: any[] = [],
        publicClients: any[] = [],
        contracts: any[] = [];

    let dripStartTime = Date.now(); // Start timing before the loop begins

    for (let i = 0; i < numWallets*threadNum; i++) {
        let freshPriv = seedPriv + BigInt(i);
        const [walletClient, publicClient, contract] = contractInterfaceSetup(
            freshPriv.toString(16),
            address,
            "http",
        );
        walletClients.push(walletClient);
        publicClients.push(publicClient);
        contracts.push(contract);
        if (process.env.DRIP_ETH === "true" && i > 0) {
            console.log("Dripping ETH to wallet number", i);
            await walletClient.sendTransaction({
                account: walletClients[0].account,
                to: walletClients[i].account.address,
                value: 100000000000000000n,
            });
        }
    }

    let dripEndTime = Date.now(); // End timing after the loop ends

    if (process.env.DRIP_ETH === "true") {
        console.log(`Dripping ETH for ${numWallets*threadNum} wallets completed in ${dripEndTime - dripStartTime}ms`);
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

/*
 * Seismic tracks a nonce for each wallet to avoid replay attacks. Note this is
 * NOT the nonce that Ethereum tracks for the wallet.
 */
export async function nonce(walletClient: any) {
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
export async function davail(
    walletClientSender: any,
    walletClientRecipient: any,
    positive: boolean,
): Promise<[string, string]> {
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
        stringifyBigInts(tx),
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

export async function upgradeContract(newContractAddress: string): Promise<void> {
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
export async function registerSwipe(
    contractSender: any,
    swipeCommitment: string,
    daSignature: string,
) {
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
        console.log(`Error registering swipe`);
    }
}

/*
 * Fetches matches of a wallet from Seismic and checks whether they're
 * consistent with what's actually shown on-chain.
 */
export async function matches(walletClient: any) {
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
    return response.data;
}

/*
 * Having a "sender" swipe on a "recipient" requires the data availability
 * share with Seismic before going directly from the client to the chain.
 */
export async function swipe(
    contractSender: any,
    walletClientSender: any,
    walletClientRecipient: any,
    positive: boolean,
) {
    const startTime = Date.now();
    const [swipeCommitment, daSignature] = await davail(
        walletClientSender,
        walletClientRecipient,
        positive,
    );
    const endTime = Date.now();
    console.log(`davail command executed in ${endTime - startTime}ms`);
    const commandStartTime = Date.now();
    await registerSwipe(contractSender, swipeCommitment, daSignature);
    const commandEndTime = Date.now();
    console.log(`registerSwipe command executed in ${commandEndTime - commandStartTime}ms`);
}

/*
 * Queries Seismic node for the latest SeismicTomo contract address.
 */
export async function getSeismicAddress(): Promise<`0x${string}`> {
    const response = await axios.get(
        `${process.env.ENDPOINT}/swipe/getseismicaddress`,
    );
    if (response.status !== 200) {
        throw new Error("Could not get Seismic address");
    }
    return response.data.seismicTomoContractAddress;
}