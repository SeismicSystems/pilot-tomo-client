import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import axios from "axios";
import { EventABIs, contractInterfaceSetup, handleAsync } from "./lib/utils";

const DEMO_CONFIG = {
    numWallets: 5,
    // symmetric likes for [0, 1] && [0, 2] && [1, 2] should match
    likes: [
        [0, 1],
        [1, 0],
        [0, 2],
        [2, 0],
        [1, 2],
        [2, 1],
        [0, 3],
        [1, 4],
    ],
    // asymmetric likes for [0, 3] && [1, 4] should not match
    dislikes: [[3, 0]],
};

function setUpContractInterfaces(
    seedPriv: BigInt,
    numWallets: number
): [any[], any[], any[]] {
    let walletClients: any[] = [],
        publicClients: any[] = [],
        contracts: any[] = [];

    for (let i = 0; i < numWallets; i++) {
        let freshPriv = seedPriv + BigInt(i);
        const [walletClient, publicClient, contract] = contractInterfaceSetup(
            `0x${freshPriv.toString(16)}`
        );
        walletClients.push(walletClient);
        publicClients.push(publicClient);
        contracts.push(contract);
    }

    return [walletClients, publicClients, contracts];
}

(async () => {
    if (!process.env.WALLET1_PRIVKEY) {
        throw new Error("Please set demo privkey env variable.");
    }

    const [walletClients, publicClients, contracts] = setUpContractInterfaces(
        BigInt(process.env.WALLET1_PRIVKEY),
        DEMO_CONFIG.numWallets
    );

    const [walletClient1, publicClient1, contract1] = contractInterfaceSetup(
        process.env.WALLET1_PRIVKEY!
    );
    // const [walletClient2, publicClient2, contract2] = contractInterfaceSetup(
    //     process.env.WALLET2_PRIVKEY!
    // );
    // let [res, err] = await handleAsync(contract1.write.swipe(["2"]));
    // if (!res || err) {
    //     console.error("[ERROR] Could not register swipe: ", err);
    //     process.exit(1);
    // }
})();

// const getNonce = async (address: string) => {
//   const response = await axios.get(
//     `http://localhost:${process.env.PORT}/wallets/${address}/nonce`
//   );
//   return response.data;
// };

// (async () => {
//   try {
//     const nonce = await getNonce("0xfff");
//     console.log("NONCE", nonce);
//   } catch (error) {
//     console.error(error);
//   }
// })();
