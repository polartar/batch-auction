// SPDX-License-Identifier: UNLICENSED
// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.12;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import './BaseDutchAuctionERC721AUpgradable.sol';
import "hardhat/console.sol";

contract BaseDutchAuctionERC721ACreator is UUPSUpgradeable, OwnableUpgradeable {
    address public beaconAddress;
    address dutchAuction;
    event CreateAuction(address _contract, string _name, string _symbol);
    /// Initializes factory
    function initialize() public initializer {
        __Ownable_init_unchained();
        __UUPSUpgradeable_init();

        // set up beacon with msg.sender as the owner
        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new BaseDutchAuctionERC721AUpgradable()));
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
    ) public onlyOwner {
        BeaconProxy proxy = new BeaconProxy(
            beaconAddress,
            abi.encodeWithSelector(
                BaseDutchAuctionERC721AUpgradable(address(0)).initialize.selector,
                payees,
                shares,
                name,
                symbol,
                _whitelistMaxMint,
                _publicListMaxMint,
                _nonReservedMax,
                _reservedMax,
                _discountedPrice
            )
        );

        emit CreateAuction(address(proxy), name, symbol);
        // return address(proxy);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}