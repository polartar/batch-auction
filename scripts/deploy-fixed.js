// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

// npx hardhat run --network rinkeby scripts/deploy-fixed.js

const hre = require("hardhat");

async function main() {
  const PAYEES = [
    "0x4448d4FD3f76F11BA4605f3C6ca91c14477Ed363",
    "0xCEa95B1d7Dd2EdeE9D6f6a7664598a8cC9052A44",
  ];

  const SHARES = [85, 15];

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
  // const Contract = await hre.ethers.getContractFactory(
  //   "LevelingUpHeroesMagical"
  // );
  // const contract = await Contract.deploy(
  //   PAYEES,
  //   SHARES,
  //   "Leveling Up Heroes - Magical Tier",
  //   "LUH-MAGICAL",
  //   1,
  //   0,
  //   6789,
  //   679,
  //   ethers.utils.parseEther("0.078")
  // );

  // console.log("Awaiting deploy...");

  // await contract.deployed();

  // console.log("Contract deployed to:", contract.address);

  await hre.run("verify:verify", {
    address: "0xEf006Bd210FAf36cCccd1c8A288936CdEdfe9d55",
    contract: "contracts/LevelingUpHeroesMagical.sol:LevelingUpHeroesMagical",
    constructorArguments: [
      PAYEES,
      SHARES,
      "Leveling Up Heroes - Magical Tier",
      "LUH-MAGICAL",
      1,
      0,
      6789,
      679,
      ethers.utils.parseEther("0.078"),
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
