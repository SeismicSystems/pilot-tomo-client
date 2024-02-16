. ../../.env

: '
  Run this script whenever you want to deploy a new Swipe contract locally.
  '

: '
  Deploy solidity verifier and save the deployment address.
  '
cd ..
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
}" > out/deploy.json
rm deploy_stdout.txt
