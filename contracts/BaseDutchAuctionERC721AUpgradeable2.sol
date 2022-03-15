// SPDX-License-Identifier: UNLICENSED
// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.12;

import "./BaseDutchAuctionERC721AUpgradeable.sol";

contract BaseDutchAuctionERC721AUpgradeable2 is BaseDutchAuctionERC721AUpgradeable {

    function updatedFunction() public pure returns (string memory){
        return "v2";
    }
}