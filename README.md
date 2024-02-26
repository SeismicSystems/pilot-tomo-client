# Contract and demo client for Tomo pilot

## Instructions on how to run

You can run this demo in either Docker mode (recommended) or manual mode.

## For both Docker and manual mode

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

## For Docker

### Prequisite
1. Make sure docker compose is install. There are 2 versions available for v1(docker-compose) & v2(docker compose). Try to use docker compose version 2 for this.
   1. [Guide to install it on macos](https://docs.docker.com/desktop/install/mac-install/)
   2. [Guide to install it on linux](https://docs.docker.com/desktop/install/linux-install/). Install based on your linux distribution (fedora, debian, ubuntu)
      1. From July 2023, Compose v1 is no longer in new Desktop releases, so you might need to install docker compose plugin manually if you are using v1. Follow this guide to do that https://docs.docker.com/compose/install/linux/
   3. [Guide to install it on windows](https://docs.docker.com/desktop/install/windows-install/)
2. Make sure that docker desktop is running


### Steps to run
Within Docker mode, if you choose to run this demo on a local network
```
docker-compose -f compose.yaml up --build
```

After this, open a new terminal window to start the client by running the following command:

```
docker-compose exec -it client bash Or docker compose exec -it client bash
cd client && pnpm dev
```

## Manual mode

##
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
