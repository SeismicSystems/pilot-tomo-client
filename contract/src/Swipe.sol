// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Swipe {
    address public seismicDA;

    mapping(address => mapping(uint256 => bool)) public swipes;

    event RegisteredSwipe(address owner, uint256 commitment);

    constructor(address _seismicDA) {
        seismicDA = _seismicDA; //0x1c7AB4564F5Cf6de26558224DB03ddf47bCA9dBC
    }

    /*     
     * @dev Register a swipe.
     */
    function swipe(uint256 commitment, uint8 v, bytes32 r, bytes32 s) public verifySeismicSig(commitment, v, r, s) {
        
        swipes[msg.sender][commitment]=true;
        emit RegisteredSwipe(msg.sender, commitment);
    }

    /*     
     * @dev Verify the signature and checks whether 
     * recovered signer is the Seismic address.
     */
    modifier verifySeismicSig(uint256 commitment, uint8 v, bytes32 r, bytes32 s){
        
        // Prefix the message to match the behavior of the Ethereum signed message
        bytes32 ethSignedMessageHash = getCommitmentHashedMsg(bytes32(commitment));

        // Recover the signer address from the signature
        address recoveredSigner = ecrecover(ethSignedMessageHash, v, r, s);

        // Check if the recovered signer is the seismicDA address
        require(recoveredSigner == seismicDA, "Invalid signature!");
        _;
    }

    /* 
     * @dev Helper function to prefix the message to match the behavior of the Ethereum signed message.
     */
    function getCommitmentHashedMsg(bytes32 commitment) public pure returns (bytes32 messageHash) {
        messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n", "32", commitment)
        );    
    }

    /*
     * @dev Returns the swipe status for a given address and commitment.
     */
    function getSwipeStatus(address owner, uint256 commitment) public view returns (bool) {
        return swipes[owner][commitment];
    }

}
