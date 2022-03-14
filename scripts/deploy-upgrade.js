const hre = require("hardhat");

async function main() {
  const { upgrades } = hre;
  // We get the contract to deploy
  const BaseDutchAuctionERC721ACreator = await ethers.getContractFactory("BaseDutchAuctionERC721ACreator");
  const baseDutchAuctionERC721ACreator = await upgrades.deployProxy(BaseDutchAuctionERC721ACreator, [],{kind: 'uups'});

  await baseDutchAuctionERC721ACreator.deployed();
  console.log("baseDutchAuctionERC721ACreator deployed to:", baseDutchAuctionERC721ACreator.address); 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
