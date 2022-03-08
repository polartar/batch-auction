// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// npx hardhat run --network rinkeby scripts/deploy-levelingup.js
// [1643870957, "5000000000000000000", 660, "25000000000000000", 140, 2]
// "1500000000000000000"
//https://gateway.pinata.cloud/ipfs/QmWBZppDGb3PadW5wCR9ohB3ENDcNYm6eTQTd5zn2C1SbQ/
// To hard set use this [0, "3000000000000000000", 1, "0", 0, 2]

const hre = require("hardhat");

async function main() {
  const PAYEES = [
    "0x4448d4FD3f76F11BA4605f3C6ca91c14477Ed363",
    "0xCEa95B1d7Dd2EdeE9D6f6a7664598a8cC9052A44",
  ];

  const SHARES = [85, 15];

  const ALLOW_LIST_MAX_MINT = 1;
  const PUBLIC_LIST_MAX_MINT = 0;
  const NON_RESERVED = 310;
  const RESERVED = 35;
  const GAS_LIMIT = 4500000;
  const GAS_PRICE = ethers.utils.parseUnits("120", "gwei");
  const DISCOUNTED_PRICE = ethers.utils.parseEther("0.75");

  // CHANGE THIS
  const TEST_VRF_COORDINATOR = "0xf0d54349aDdcf704F77AE15b96510dEA15cb7952";
  const TEST_LINK_ADDRESS = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
  const TEST_KEY_HASH =
    "0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445";

  // DEPLOY BASE FIXED PRICE CONTRACT

  //   constructor(
  //     address[] memory payees,
  //     uint256[] memory shares,
  //     string memory name,
  //     string memory symbol,
  //     uint256 _whitelistMaxMint,
  //     uint256 _publicListMaxMint,
  //     uint256 _nonReservedMax,
  //     uint256 _reservedMax,
  //     uint256 _price
  // )

  // const Contract = await hre.ethers.getContractFactory("LevelingUpHeroesEpic");
  // const contract = await Contract.deploy(
  //   PAYEES,
  //   SHARES,
  //   "Leveling Up Heroes - Epic Tier",
  //   "LUH-EPIC",
  //   ALLOW_LIST_MAX_MINT,
  //   PUBLIC_LIST_MAX_MINT,
  //   NON_RESERVED,
  //   RESERVED,
  //   DISCOUNTED_PRICE
  // );

  // console.log("Awaiting deploy...");

  // await contract.deployed();

  // console.log("Contract deployed to:", contract.address);

  await hre.run("verify:verify", {
    address: "0xbc74C101ecCd29dC72689544A88403622138eC89",
    contract: "contracts/LevelingUpHeroesEpic.sol:LevelingUpHeroesEpic",
    constructorArguments: [
      PAYEES,
      SHARES,
      "Leveling Up Heroes - Epic Tier",
      "LUH-EPIC",
      ALLOW_LIST_MAX_MINT,
      PUBLIC_LIST_MAX_MINT,
      NON_RESERVED,
      RESERVED,
      DISCOUNTED_PRICE,
    ],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
