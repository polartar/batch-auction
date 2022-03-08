// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.10;

import "./ERC721Sequential.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BaseFixedPriceAuction is ERC721Sequential, ReentrancyGuard, Ownable {
    using Strings for uint256;
    using ECDSA for bytes32;

    string public prefix = "Base Verification:";
    string private baseTokenURI = '';

    mapping(address => uint256) public _whitelistClaimed;
    mapping(address => uint256) public _publicListClaimed;

    uint256 public nonReservedMax;
    uint256 public reservedMax;
    uint256 public max;
    uint256 public nonReservedMinted;
    uint256 public reservedMinted;
    uint256 public price;
    uint256 public whitelistMaxMint;
    uint256 public publicListMaxMint;

    PaymentSplitter private _splitter;

    constructor(
        address[] memory payees, 
        uint256[] memory shares,
        string memory name,
        string memory symbol,
        uint256 _whitelistMaxMint, 
        uint256 _publicListMaxMint,
        uint256 _nonReservedMax,
        uint256 _reservedMax,
        uint256 _price
    )
        ERC721Sequential(name, symbol)
    {
        whitelistMaxMint = _whitelistMaxMint;
        publicListMaxMint = _publicListMaxMint;
        nonReservedMax = _nonReservedMax;
        reservedMax = _reservedMax;
        max = nonReservedMax + reservedMax;
        nonReservedMinted = 0;
        reservedMinted = 0;
        _splitter = new PaymentSplitter(payees, shares);
        price = _price;
    }

    function totalSupply() public view returns (uint256) {
        return _owners.length;
    }

    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    function release(address payable account) external {
        _splitter.release(account);
    }

    function _hash(address _address) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(prefix, _address));
    }

    function _verify(bytes32 hash, bytes memory signature) internal view returns (bool) {
        return (_recover(hash, signature) == owner());
    }

    function _recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        return hash.recover(signature);
    }

    function setPrefix(string memory _prefix) public onlyOwner {
        prefix = _prefix;
    }

    function setWhitelistMaxMint(uint256 _whitelistMaxMint) external onlyOwner {
        whitelistMaxMint = _whitelistMaxMint;
    }

    function setPublicListMaxMint(uint256 _publicListMaxMint) external onlyOwner {
        publicListMaxMint = _publicListMaxMint;
    }

    function mintPublic(uint256 numberOfTokens) external payable {
        require(_publicListClaimed[msg.sender] + numberOfTokens <= publicListMaxMint, 'You cannot mint this many.');

        _publicListClaimed[msg.sender] += numberOfTokens;
        _nonReservedMintHelper(numberOfTokens);
    }
    
    function mintWhitelist(bytes32 hash, bytes memory signature, uint256 numberOfTokens) external payable {
        require(_verify(hash, signature), "This hash's signature is invalid.");
        require(_hash(msg.sender) == hash, "The address hash does not match the signed hash.");
        require(_whitelistClaimed[msg.sender] + numberOfTokens <= whitelistMaxMint, 'You cannot mint this many.');

        _whitelistClaimed[msg.sender] += numberOfTokens;
        _nonReservedMintHelper(numberOfTokens);
    }

    function _nonReservedMintHelper(uint256 numberOfTokens) internal {
        require(numberOfTokens * price == msg.value, "Invalid amount.");
        require(_owners.length + numberOfTokens <= max, "Sold out.");

        uint256 ownersLength = _owners.length;

        for(uint256 i; i < numberOfTokens; i++) { 
            _mint(_msgSender(), ownersLength + i);
        }
    }

    function splitPayments() public payable onlyOwner {
        (bool success, ) = payable(_splitter).call{value: address(this).balance}(
        ""
        );
        require(success);
    }

    function mintReserved() external onlyOwner {
        require(_owners.length == 0, 'Reserves already taken.');

        for (uint256 i = 0; i < reservedMax; i++) {
            _mint(_msgSender(), i);
        }
    }

    function setBaseURI(string memory baseTokenURI_) external onlyOwner {
        baseTokenURI = baseTokenURI_;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        return string(abi.encodePacked(baseTokenURI, tokenId.toString()));
    }

    function _mint(address to, uint256 tokenId) internal virtual override {
        _owners.push(to);
        emit Transfer(address(0), to, tokenId);
    }
}