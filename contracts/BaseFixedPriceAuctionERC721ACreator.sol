// SPDX-License-Identifier: UNLICENSED
// Author: Eric Gao (@itsoksami, https://github.com/Ericxgao)

pragma solidity 0.8.13;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import './BaseFixedPriceAuctionERC721AUpgradeable.sol';

contract BaseFixedPriceAuctionERC721ACreator is OwnableUpgradeable, UUPSUpgradeable{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _auctionIds;


    IBeacon public beacon;
    mapping(uint256 => address) auctions;
    event CreateAuction(uint256 indexed index, address _contract, string _name, string _symbol);

    function initialize(
     IBeacon _beacon
    ) public initializer {
        __UUPSUpgradeable_init();
       __Ownable_init();  
       beacon = _beacon;
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
    ) public returns(address) {
        BeaconProxy proxy = new BeaconProxy(
            address(beacon),
            abi.encodeWithSelector(
                BaseFixedPriceAuctionERC721AUpgradeable(address(0)).initialize.selector,
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
        BaseFixedPriceAuctionERC721AUpgradeable auction = BaseFixedPriceAuctionERC721AUpgradeable(address(proxy));
        auction.transferOwnership(msg.sender);

        _auctionIds.increment();
        uint256 newAuctionId = _auctionIds.current();
        auctions[newAuctionId] = address(proxy);
        emit CreateAuction(newAuctionId, address(proxy), name, symbol);

        return address(proxy);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function getAuction(uint256 id) public view returns(address) {
        return auctions[id];
    }
}