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
import { getMessage } from "eip-712";

import SwipeAPI from "../../../contract/out/Swipe.sol/Swipe.json" assert { type: "json" };
import deploy from "../../../contract/out/deploy.json" assert { type: "json" };

export const EventABIs = {
    RegisteredSwipe: parseAbiItem("event RegisteredSwipe(uint256 commitment)"),
};

/*
 * Sets up a contract interface with Viem.
 */
function contractInterfaceSetup(privKey: string): [any, any, any] {
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

export function setUpContractInterfaces(
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
    }

    return [walletClients, publicClients, contracts];
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

function uint8ArrayToHexString(byteArray: Uint8Array): string {
    return Array.from(byteArray, function (byte) {
        return ("0" + (byte & 0xff).toString(16)).slice(-2);
    }).join("");
}

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
