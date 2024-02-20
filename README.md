# Contract and demo client for Tomo pilot

## Instructions on how to run

You can run this demo in either Docker mode (recommended) or manual mode.

### For both Docker and manual mode

Set the following environment variables in a `.env` file in the root directory (this one):

```
# == Seismic config
# - URL and port for sequencer
ENDPOINT=
# - Public key the sequencer signs with (including the `0x` prefix)
SEQUENCER_ADDR=
# ==

# == Release details
# - Version
VERSION=
# - Chain ID
CHAIN_ID=
# - Address of swipe contract
CONTRACT_ADDR=
# ==

# == Test wallets (all the below variables should be set without the `0x` prefix)
# - Private key loaded with ETH for deploying contract
DEV_PRIVKEY=
# - Sample user #1. Must have ETH in relevant network
WALLET1_PRIVKEY=
# - Sample user #2. Must have ETH in relevant network
WALLET2_PRIVKEY=
# ==

# == Option to drip ETH -- you can (optionally) drip ETH to each wallet on start-up by enabling this flag to `true`
DRIP_ETH=
# ==
```

### Docker mode: local network (Anvil)

Within Docker mode, if you choose to run this demo on a local network, e.g. Anvil, then run the following command:

```
docker-compose -f local-compose.yaml up --build
```

After this, open a new terminal window to start the client by running the following command:

```
docker-compose exec -it client sh
cd client && pnpm dev
```

### Docker mode: testnet (Arbitrum Sepolia)

Within Docker mode, if you choose to run this demo on a testnet, e.g. Arbitrum Sepolia, then run the following command:

```
docker-compose up --build
```

After this, open a new terminal window to start the client by running the following command:

```
docker-compose exec -it client bash
cd client && pnpm dev
```

### Manual mode

1. Deploy the Swipe contract. Have an anvil node running and run the following script.

```
cd contract/script
bash deploy.sh
```

2. Install client dependencies.

```
cd client/
pnpm install
```

3. Commit a terminal to listening for contract events. Used for display purposes so you know what's happening on-chain. Keep this tab open as you run the next step

```
cd client/
pnpm run listen
```

4. Run the demo.

```
pnpm run dev
```
