// SPDX-License-Identifier: UNLICENSED
// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.12;

import "./ERC721AUpgradeable.sol";
import "./LinearDutchAuctionUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "hardhat/console.sol";
contract BaseDutchAuctionERC721AUpgradable is ERC721AUpgradeable, LinearDutchAuctionUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using StringsUpgradeable for uint256;
    using ECDSA for bytes32;

    string public prefix;
    string public prefixDiscounted;
    string private baseTokenURI;

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

    function initialize(
        address[] memory payees, 
        uint256[] memory shares,
        string memory name,
        string memory symbol,
        uint256 _whitelistMaxMint, 
        uint256 _publicListMaxMint,
        uint256 _nonReservedMax,
        uint256 _reservedMax,
        uint256 _discountedPrice
    ) public initializer {
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __LinearDutchAuctionUpgradeable_init(
            LinearDutchAuctionUpgradeable.DutchAuctionConfig({
                startPoint: 0, // disabled at deployment
                startPrice: 5 ether,
                unit: AuctionIntervalUnit.Time,
                decreaseInterval: 900, // 15 minutes
                decreaseSize: 0.5 ether,
                numDecreases: 9
            }),
            .5 ether
        );
        __ERC721A_init(name, symbol);
        transferOwnership(tx.origin);

        whitelistMaxMint = _whitelistMaxMint;
        publicListMaxMint = _publicListMaxMint;
        nonReservedMax = _nonReservedMax;
        reservedMax = _reservedMax;
        max = nonReservedMax + reservedMax;
        nonReservedMinted = 0;
        reservedMinted = 0;
        discountedPrice = _discountedPrice;
        _splitter = new PaymentSplitter(payees, shares);

        prefix = "Leveling Up Heroes Epic Base Verification:";
        prefixDiscounted = "Leveling Up Heroes Epic Discounted Verification:";
    }
   
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner{ }
    
    function release(address payable account) external {
        _splitter.release(account);
    }

    function _hash(string memory _prefix, address _address) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_prefix, _address));
    }

    function _verify(bytes32 hash, bytes memory signature) internal view returns (bool) {
        bytes32 signedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        return (_recover(signedHash, signature) == owner());
    }

    function _recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        return hash.recover(signature);
    }

    function setPrefix(string memory _prefix) external onlyOwner {
        prefix = _prefix;
    }

    function setPrefixDiscounted(string memory _prefix) external onlyOwner {
        prefixDiscounted = _prefix;
    }

    function setWhitelistMaxMint(uint256 _whitelistMaxMint) external onlyOwner {
        whitelistMaxMint = _whitelistMaxMint;
    }

    function setPublicListMaxMint(uint256 _publicListMaxMint) external onlyOwner {
        publicListMaxMint = _publicListMaxMint;
    }

    function mintPublic(uint256 numberOfTokens) external payable {
        require(_publicListClaimed[msg.sender] + _whitelistClaimed[msg.sender] + numberOfTokens <= publicListMaxMint, 'You cannot mint this many.');

        _publicListClaimed[msg.sender] += numberOfTokens;
        _nonReservedMintHelper(numberOfTokens);
    }
    
    function mintWhitelist(bytes32 hash, bytes memory signature, uint256 numberOfTokens) external payable {
        require(_verify(hash, signature), "This hash's signature is invalid.");
        require(_hash(prefix, msg.sender) == hash, "Not signer of the hash");
        require(_whitelistClaimed[msg.sender] + numberOfTokens <= whitelistMaxMint, 'You cannot mint this many.');

        _whitelistClaimed[msg.sender] += numberOfTokens;
        _nonReservedMintHelper(numberOfTokens);
    }

    function _nonReservedMintHelper(uint256 numberOfTokens) internal nonReentrant {
        require(totalSupply() + numberOfTokens <= max, "Sold out.");
        uint256 price = cost(numberOfTokens);
        require(price <= msg.value, "Invalid amount.");

        _safeMint(msg.sender, numberOfTokens);

        if (msg.value > price) {
            address payable reimburse = payable(_msgSender());
            uint256 refund = msg.value - price;
            (bool success, bytes memory returnData) = reimburse.call{
                value: refund
            }("");

            require(success, string(returnData));
        }
    }

    function splitPayments() external payable onlyOwner {
        (bool success, ) = payable(_splitter).call{value: address(this).balance}(
        ""
        );
        require(success);
    }

    function mintReserved(uint256 quantity) external onlyOwner {
        require(
            totalSupply() + quantity <= reservedMax,
            "Sold out."
        );

        _safeMint(msg.sender, quantity);
       
    }

    function mintWhitelistDiscounted(bytes32 hash, bytes memory signature, uint256 numberOfTokens) external payable {
        require(_verify(hash, signature), "Invalid signaure");
        require(_hash(prefixDiscounted, msg.sender) == hash, "Not signer of the hash");
        require(_whitelistClaimed[msg.sender] + numberOfTokens <= whitelistMaxMint, 'You cannot mint this many.');
        require(discountedPrice == msg.value, "Invalid amount.");

        _whitelistClaimed[msg.sender] += numberOfTokens;
        _safeMint(msg.sender, numberOfTokens);
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