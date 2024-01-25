import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import {
    createEIP712Types,
    createEIP712DomainType,
} from "./eip712.interface";

export type Swipe = {
    recipient: string;
    positive: boolean;
    blind: string;
};
export const swipeDAReqTyped = {
    label: "SwipeReq",
    types: createEIP712Types("SwipeReq", [
        { name: "recipient", type: "address" },
        { name: "positive", type: "bool" },
        { name: "blind", type: "uint256" },
    ]),
    domain: createEIP712DomainType("Tomo Swipe Data Availability Request"),
};

export type MatchReq = {
    startIndex: number;
};
export const swipeMatchTyped = {
    label: "Match",
    types: createEIP712Types("Match", [{ name: "startIndex", type: "uint64" }]),
    domain: createEIP712DomainType("Tomo Swipe Match Request"),
};
