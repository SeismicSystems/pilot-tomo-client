/*
 * See eip-712 library for typescript to learn about the below interfaces.
 */
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

/*
 * Constructs a type object to be used for hashing typed data. Stored in the
 * format that Seismic expects authenticated transactions to be in.
 *
 */
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

/*
 * Type of the domain separator we choose to use at Seismic.
 */
export function createEIP712DomainType(name: string) {
    return {
        name,
        version: process.env.VERSION,
        chainId: Number(process.env.CHAIN_ID),
        verifyingContract: `0x${process.env.CONTRACT_ADDR}`,
    };
}
