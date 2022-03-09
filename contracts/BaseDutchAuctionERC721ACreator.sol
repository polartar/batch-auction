// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.12;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol';
import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import './BaseDutchAuctionERC721A.sol';

contract BaseDutchAuctionERC721ACreator is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using ECDSAUpgradeable for bytes32;

    // ============ Storage ============
    address public admin;
    address public beaconAddress;
    // registry of created contracts
    address[] public dutchContracts;

    // ============ Events ============

    /// Emitted when an Artist is created
    event CreatedAuction(uint256 auctionIndex, string name, string symbol, address indexed auctionAddress);

    // ============ Functions ============

    /// Initializes factory
    function initialize() public initializer {
        __Ownable_init_unchained();

        // set admin for artist deployment authorization
        admin = msg.sender;

        // set up beacon with msg.sender as the owner
        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new BaseDutchAuctionERC721A()));
        _beacon.transferOwnership(msg.sender);
        beaconAddress = address(_beacon);
    }

    function createAuction(
        address[] memory payees, 
        uint256[] memory shares,
        string memory name,
        string memory symbol,
        uint256 _whitelistMaxMint, 
        uint256 _publicListMaxMint,
        uint256 _nonReservedMax,
        uint256 _reservedMax,
        uint256 _discountedPrice
    ) public onlyOwner returns (address) {
        BeaconProxy proxy = new BeaconProxy(
            beaconAddress,
            abi.encodeWithSelector(
                Artist(address(0)).initialize.selector,
                payees,
                shares,
                name,
                symbol,
                _whitelistMaxMint,
                _publicListMaxMint,
                _nonreservedMax,
                _reservedMax,
                _discountedPrice
            )
        );

        // add to registry
        dutchContracts.push(address(proxy));

        emit CreatedAuction(dutchContracts.length, _name, _symbol, address(proxy));

        return address(proxy);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}