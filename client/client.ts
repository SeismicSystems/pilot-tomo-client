import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const getNonce = async (address: string) => {
  const response = await axios.get(
    `http://localhost:${process.env.PORT}/wallets/${address}/nonce`
  );
  return response.data;
};

(async () => {
  try {
    const nonce = await getNonce("0xfff");
    console.log("NONCE", nonce);
  } catch (error) {
    console.error(error);
  }
})();
