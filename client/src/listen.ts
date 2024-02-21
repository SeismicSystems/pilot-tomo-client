import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { EventABIs, contractInterfaceSetup } from "./lib/utils";

/*
 * Prints all Swipe events to stdout as they come.
 */
let [_, publicClient, contract] = contractInterfaceSetup(
    process.env.DEV_PRIVKEY || "",
    `0x${process.env.CONTRACT_ADDR}`,
);
Object.values(EventABIs).forEach((abi) => {
    publicClient.watchEvent({
        // address: contract.address,
        event: abi,
        strict: true,
        onLogs: (logs: [any]) => {
            logs.forEach((log) =>
                console.log({ eventName: log["eventName"], args: log["args"] }),
            );
        },
    });
});
