source ../../.env

: '
  Run this script whenever you want to deploy a new swipe contract locally.
  '

RPC_URL=http://localhost:8545
DEV_PRIV_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

: '
  Deploy solidity verifier and save the deployment address.
  '
forge create src/Swipe.sol:Swipe \
  --rpc-url $RPC_URL \
  --private-key $DEV_PRIV_KEY \
  --constructor-args $SEQUENCER_ADDR >deploy_stdout.txt
SWIPE_CONTRACT_ADDR=$(awk '/Deployed to:/ {print $3}' deploy_stdout.txt)

: '
  Write deployment details to a JSON for use in client and server.
  '
echo "{ 
    \"swipeContractAddress\": \"$SWIPE_CONTRACT_ADDR\"
}" >../out/deploy.json
rm deploy_stdout.txt
