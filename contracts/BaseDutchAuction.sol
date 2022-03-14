// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.12;

import "./ERC721Sequential.sol";
import "./LinearDutchAuction.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BaseDutchAuction is ERC721Sequential, LinearDutchAuction, ReentrancyGuard {
    using Strings for uint256;
    using ECDSA for bytes32;

    string public prefix = "Base Verification:";
    string public prefixDiscounted = "Discounted Verification:";
    string private baseTokenURI = '';

    mapping(address => uint256) private _whitelistClaimed;
    mapping(address => uint256) private _publicListClaimed;

    uint256 public whitelistMaxMint;
    uint256 public publicListMaxMint;
    uint256 public nonReservedMax;
    uint256 public reservedMax;
    uint256 public max;
    uint256 public nonReservedMinted;
    uint256 public reservedMinted;
    uint256 public discountedPrice;

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
        uint256 _discountedPrice
    )
        ERC721Sequential(name, symbol)
        LinearDutchAuction(
            LinearDutchAuction.DutchAuctionConfig({
                startPoint: 0, // disabled at deployment
                startPrice: 5 ether,
                unit: AuctionIntervalUnit.Time,
                decreaseInterval: 900, // 15 minutes
                decreaseSize: 0.025 ether,
                numDecreases: 140
            }),
            1.5 ether
        )
    {
        whitelistMaxMint = _whitelistMaxMint;
        publicListMaxMint = _publicListMaxMint;
        nonReservedMax = _nonReservedMax;
        reservedMax = _reservedMax;
        max = nonReservedMax + reservedMax;
        nonReservedMinted = 0;
        reservedMinted = 0;
        discountedPrice = _discountedPrice;
        _splitter = new PaymentSplitter(payees, shares);
    }

    function totalSupply() public view returns (uint256) {
        return _owners.length;
    }

    function release(address payable account) external {
        _splitter.release(account);
    }

    function _hash(string memory _prefix, address _address) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_prefix, _address));
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

    function setPrefixDiscounted(string memory _prefix) public onlyOwner {
        prefixDiscounted = _prefix;
    }

    function setWhitelistMaxMint(uint256 _whitelistMaxMint) external onlyOwner {
        whitelistMaxMint = _whitelistMaxMint;
    }

    function setPublicListMaxMint(uint256 _publicListMaxMint) external onlyOwner {
        publicListMaxMint = _publicListMaxMint;
    }

    function mintPublic(uint256 numberOfTokens) external payable {
        require(_publicListClaimed[msg.sender] + numberOfTokens <= publicListMaxMint, 'You cannot mint this many.');

        _nonReservedMintHelper(numberOfTokens);
        _publicListClaimed[msg.sender] += numberOfTokens;
    }
    
    function mintWhitelist(bytes32 hash, bytes memory signature, uint256 numberOfTokens) external payable {
        require(_verify(hash, signature), "This hash's signature is invalid.");
        require(_hash(prefix, msg.sender) == hash, "The address hash does not match the signed hash.");
        require(_whitelistClaimed[msg.sender] + numberOfTokens <= whitelistMaxMint, 'You cannot mint this many.');

        _nonReservedMintHelper(numberOfTokens);
        _whitelistClaimed[msg.sender] += numberOfTokens;
    }

    function _nonReservedMintHelper(uint256 numberOfTokens) internal nonReentrant {
        require(_owners.length + numberOfTokens < max, "Sold out.");
        uint256 price = cost(numberOfTokens);
        require(price <= msg.value, "Invalid amount.");

        uint256 ownersLength = _owners.length;

        for(uint256 i; i < numberOfTokens; i++) { 
            _mint(_msgSender(), ownersLength + i);
        }

        if (msg.value > price) {
            address payable reimburse = payable(_msgSender());
            uint256 refund = msg.value - price;

            // Using Address.sendValue() here would mask the revertMsg upon
            // reentrancy, but we want to expose it to allow for more precise
            // testing. This otherwise uses the exact same pattern as
            // Address.sendValue().
            (bool success, bytes memory returnData) = reimburse.call{
                value: refund
            }("");
            // Although `returnData` will have a spurious prefix, all we really
            // care about is that it contains the ReentrancyGuard reversion
            // message so we can check in the tests.
            require(success, string(returnData));
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

    function mintWhitelistDiscounted(bytes32 hash, bytes memory signature, uint256 numberOfTokens) external payable {
        require(_verify(hash, signature), "This hash's signature is invalid.");
        require(_hash(prefixDiscounted, msg.sender) == hash, "The address hash does not match the signed hash.");
        require(_whitelistClaimed[msg.sender] + numberOfTokens <= whitelistMaxMint, 'You cannot mint this many.');
        require(discountedPrice == msg.value, "Invalid amount.");

        uint256 ownersLength = _owners.length;
        _whitelistClaimed[msg.sender] += numberOfTokens;
        _mint(_msgSender(), ownersLength + 1);
    }

    function setBaseURI(string memory baseTokenURI_) external onlyOwner {
        baseTokenURI = baseTokenURI_;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return string(abi.encodePacked(baseTokenURI, tokenId.toString()));
    }
}