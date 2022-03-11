// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.10;

import "./BaseDutchAuctionERC721AUpgradable.sol";

contract BaseDutchAuctionERC721AUpgradable2 is BaseDutchAuctionERC721AUpgradable {

    function updatedFunction() public pure returns (string memory){
        return "v2";
    }
}