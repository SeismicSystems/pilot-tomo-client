// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface ISeismicTomo {
    function verifySeismicSig(uint256 commitment, uint8 v, bytes32 r, bytes32 s) external view returns (bool);
}