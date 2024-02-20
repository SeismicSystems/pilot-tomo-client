// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Seismic {

    
    function verifySeismicSig(uint256 commitment, uint8 v, bytes32 r, bytes32 s, address expectedSigner) public pure returns (bool) {
        bytes32 ethSignedMessageHash = getCommitmentHashedMsg(bytes32(commitment));
        address recoveredSigner = ecrecover(ethSignedMessageHash, v, r, s);
        return recoveredSigner == expectedSigner;
    }

    function getCommitmentHashedMsg(bytes32 commitment) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", commitment));
    }
}