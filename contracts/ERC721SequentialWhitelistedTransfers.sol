// @author 

pragma solidity ^0.8.10;

import "./ERC721Sequential.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract ERC721SequentialWhitelistedTransfers is ERC721Sequential, Ownable {
  constructor(string memory name_, string memory symbol_) ERC721Sequential(name_, symbol_) {}

  mapping(address => bool) public allowedTransfers;

  function setAllowedTransfers(address[] calldata addresses, bool _allowed) public onlyOwner {
    for(uint256 i; i < addresses.length; i++) { 
        allowedTransfers[addresses[i]] = _allowed;
    }
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override {
    if (from != address(0)) {
      require(allowedTransfers[to], "ERC721: transfer to non-whitelisted address");
    }
  }
}