import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { createEIP712Types, createEIP712DomainType } from "./eip712.interface";

/*
 * Used to sign messages with ETH privkey prior to sending packet to
 * /swipe/davail endpoint.
 */
export const swipeDAReqTyped = {
    label: "SwipeReq",
    types: createEIP712Types("SwipeReq", [
        { name: "recipient", type: "address" },
        { name: "positive", type: "bool" },
        { name: "blind", type: "uint256" },
    ]),
    domain: createEIP712DomainType("Tomo Swipe Data Availability Request"),
};

/*
 * Used to sign messages with ETH privkey prior to sending packet to
 * /swipe/matches endpoint.
 */
export const swipeMatchTyped = {
    label: "Match",
    types: createEIP712Types("Match", [{ name: "startIndex", type: "uint64" }]),
    domain: createEIP712DomainType("Tomo Swipe Match Request"),
};
