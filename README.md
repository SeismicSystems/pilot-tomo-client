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
# - Address of swipe contract (dummy for now)
CONTRACT_ADDR=
# ==

# == Test wallets (all the below variables should be set without the `0x` prefix)
# - Private key loaded with ETH for deploying contract, should have at least 10 Sepolia ETH
DEV_PRIVKEY=
# ==

# == Derive demo wallets
# - Demo uses DEV_PRIVKEY to derive 5 privkeys. On the first run, you need to drip ETH to these privkeys. Subsequent runs should set this to `false`
DRIP_ETH=
# ==
```

### Docker mode

This demo runs on the Arbitrum Sepolia testnet. Run the following command to deploy Tomo's Swipe contract:

```
docker-compose up --build
```

The above command also starts an event listener so you can see what's going on in the contract. You should keep this running for the next step.

Now open a new terminal window to start the client by running the following command:

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
