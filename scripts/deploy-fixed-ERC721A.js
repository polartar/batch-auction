// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// npx hardhat run --network rinkeby scripts/deploy-fixed-ERC721A.js

const hre = require("hardhat");

async function main() {
  const PAYEES = [
    "0x413a139350bb96B3FB3D73243e3fD238FD9938da",
    "0x775A6c15ce78E38cA4096e2357cFc6023e0AF925",
    "0x2B12d97352cEB8eC99d394788a9a9f110f914907",
  ];

  const SHARES = [75, 15, 10];

  const ALLOW_LIST_MAX_MINT = 12;
  const PUBLIC_LIST_MAX_MINT = 6;
  const NON_RESERVED = 8;
  const RESERVED = 2;
  const GAS_LIMIT = 4000000;
  const GAS_PRICE = ethers.utils.parseUnits("75", "gwei");

  // CHANGE THIS
  const TEST_VRF_COORDINATOR = "0xf0d54349aDdcf704F77AE15b96510dEA15cb7952";
  const TEST_LINK_ADDRESS = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
  const TEST_KEY_HASH =
    "0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445";

  // DEPLOY BASE FIXED PRICE CONTRACT
  const Contract = await hre.ethers.getContractFactory(
    "BaseFixedPriceAuctionERC721A"
  );
  const contract = await Contract.deploy(
    PAYEES,
    SHARES,
    "BaseDutchAuction",
    "BDA",
    100,
    100,
    NON_RESERVED,
    RESERVED,
    ethers.utils.parseEther("0.005")
  );

  console.log("Awaiting deploy...");

  await contract.deployed();

  console.log("Contract deployed to:", contract.address);

  // await hre.run("verify:verify", {
  //   address: "0xFc19Eeb665a5A3c9840D0C0ED0b396cC1Ff58Fe3",
  //   constructorArguments: [
  //     PAYEES,
  //     SHARES,
  //     "BaseDutchAuction",
  //     "BDA",
  //     100,
  //     100,
  //     NON_RESERVED,
  //     RESERVED,
  //     ethers.utils.parseEther("0.005"),
  //   ],
  // });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
