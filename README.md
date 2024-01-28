# Contract and demo client for Tomo pilot

## Instructions on how to run
1. Set the following environment variables in a `.env` file in the root directory (this one):
```
# == Seismic config
# - URL and port for sequencer
ENDPOINT=
# - Public key the sequencer signs with
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

# == Test wallets
# - Private key loaded with ETH for deploying contract
DEV_PRIVKEY=
# - Sample user #1. Must have ETH in relevant network
WALLET1_PRIVKEY=
# - Sample user #2. Must have ETH in relevant network
WALLET2_PRIVKEY=
# ==
```

2. Deploy the Swipe contract. Have an anvil node running and run the following script.
```
cd contract/script
bash deploy.sh
```

3. Install client dependencies.
```
cd client/
pnpm install
```

4. Commit a terminal to listening for contract events. Used for display purposes so you know what's happening on-chain. Keep this tab open as you run the next step
```
cd client/
pnpm run listen
```

5. Run the demo.
```
pnpm run dev
```

