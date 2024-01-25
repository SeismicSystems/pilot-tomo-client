export interface EIP712DomainType {
    name: string;
    version: string | undefined;
    chainId: number;
    verifyingContract: string;
}

interface EIP712DomainTypeElement {
    name: string;
    type: string;
}
export interface EIP712Types {
    EIP712Domain: EIP712DomainTypeElement[];
    [key: string]: any;
}

export const EIP712DomainSpec = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
];

export function createEIP712Types(
    bodyType: string,
    bodySpec: { name: string; type: string }[]
) {
    return {
        EIP712Domain: EIP712DomainSpec,
        [bodyType]: bodySpec,
        [`${bodyType}Tx`]: [
            { name: "nonce", type: "uint256" },
            { name: "body", type: bodyType },
        ],
    };
}

export function createEIP712DomainType(name: string) {
    return {
        name,
        version: process.env.VERSION,
        chainId: Number(process.env.CHAIN_ID),
        verifyingContract: `0x${process.env.CONTRACT_ADDR}`,
    };
}
