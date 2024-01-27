// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Signature} from "../lib/Signature.sol";

contract Swipe {
    address public seismicDA;

    event RegisteredSwipe(address owner, uint256 commitment);

    /*
     * Contract initialied with the public address of the Seismic node used
     * for this application.
     */
    constructor(address _seismicDA) {
        seismicDA = _seismicDA;
    }

    /*
     * Registers a swipe on behalf of the sender. The hiding commitment should
     * open to the raw swipe, which includes details like the recipient and
     * affinity.
     */
    function swipe(
        uint256 commitment,
        Signature memory sig
    ) public verifySeismicSig(sig) {
        emit RegisteredSwipe(msg.sender, commitment);
    }

    /*
     * Verifying the data availability signature ensures the user shared the
     * swipe with Seismic prior to registering it.
     */
    modifier verifySeismicSig(Signature memory sig) {
        // [TODO] add require statement
        _;
    }
}
