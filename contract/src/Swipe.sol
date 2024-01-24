// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Signature} from "../lib/Signature.sol";

contract Swipe {
    address public seismicDA;

    event RegisteredSwipe(uint256 commitment);

    constructor(address _seismicDA) {
        seismicDA = _seismicDA;
    }

    function swipe(uint256 commitment) public {
        emit RegisteredSwipe(commitment);
    }
}
