// SPDX-License-Identifier: UNLICENSED
// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.12;

import "./BaseDutchAuctionERC721ACreator.sol";

contract BaseDutchAuctionERC721ACreator2 is BaseDutchAuctionERC721ACreator {
    function updatedFunction() public pure returns (string memory){
        return "v2";
    }
}