const hre = require("hardhat");

async function main() {
  const { upgrades } = hre;
  // We get the contract to deploy
  const auctionFactory = await ethers.getContractFactory("BaseDutchAuctionERC721AUpgradeable");
  const auctionBeacon = await upgrades.deployBeacon(auctionFactory);

  console.log("Beacon address", auctionBeacon.address);

  auctionCreatorFactory = await ethers.getContractFactory("BaseDutchAuctionERC721ACreator");
  auctionCreator = await upgrades.deployProxy(auctionCreatorFactory, [auctionBeacon.address], {kind : "uups"});
  await auctionCreator.deployed();

  console.log("AuctionCreator address: ", auctionCreator.address);

  //testnet rinkeby: 0x24FD96988a58295d389300f74Cf69FF364b3103E
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
