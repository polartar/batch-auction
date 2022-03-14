const hre = require("hardhat");

async function main() {
  const { upgrades } = hre;
  // We get the contract to deploy
  const ALLOW_LIST_MAX_MINT = 3;
  const TOTAL_RESERVED_SUPPLY = 2;
  const TOTAL_SALE_SUPPLY = 8;
  const PRICE_DISCOUNTED = "2000000000000000000";
  const BaseDutchAuctionERC721ACreator = await ethers.getContractFactory("BaseDutchAuctionERC721ACreator");
  const baseDutchAuctionERC721ACreator = await upgrades.deployProxy(BaseDutchAuctionERC721ACreator, [
    ["0xe456f9A32E5f11035ffBEa0e97D1aAFDA6e60F03", "0x4c6348bf16FeA56F3DE86553c0653b817bca799A", "0xdBC3A556693CBb5682127864fd80C8ae6976bfcf"],
    [75, 15, 10],
    "BaseDutchAuctionTest",
    "BDAT",
    ALLOW_LIST_MAX_MINT,
    0,
    TOTAL_SALE_SUPPLY,
    TOTAL_RESERVED_SUPPLY,
    PRICE_DISCOUNTED,
  ],{kind: 'uups'});

  //testnet 

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
