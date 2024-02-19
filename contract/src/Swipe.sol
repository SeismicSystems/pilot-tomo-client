// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ISeismic} from "./interfaces/ISeismic.sol";

contract Swipe {
    
    ISeismic seismic;
    address public seismicDA;

    mapping(address => mapping(uint256 => bool)) public swipes;

    event RegisteredSwipe(address owner, uint256 commitment);

    constructor(address _seismicDA, address _seismic) {
        seismicDA = _seismicDA; 
        seismic = ISeismic(_seismic);
    }

    /*     
     * @dev Register a swipe.
     */
    function swipe(uint256 commitment, uint8 v, bytes32 r, bytes32 s) public {
        require(seismic.verifySeismicSig(commitment, v, r, s, seismicDA), "Invalid signature!");
        swipes[msg.sender][commitment]=true;
        emit RegisteredSwipe(msg.sender, commitment);
    }


    /*
     * @dev Returns the swipe status for a given address and commitment.
     */
    function getSwipeStatus(address owner, uint256 commitment) public view returns (bool) {
        return swipes[owner][commitment];
    }

}
