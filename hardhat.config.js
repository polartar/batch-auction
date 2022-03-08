require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const KEY_FILE = require("./PRIVATE_KEY.json");
const PRIVATE_KEY = KEY_FILE.PRIVATE_KEY;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    matic: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [PRIVATE_KEY],
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/j0ktCyFHlKmPB56gs_d_cQG1IdDioY8x`,
      accounts: [PRIVATE_KEY],
    },
    mainnet: {
      url: "https://eth-mainnet.alchemyapi.io/v2/UtLByqa2uZJ7FW-uSXCvu6W4HvFOTDZc",
      accounts: [PRIVATE_KEY],
    },
    gorli: {
      url: "https://eth-goerli.alchemyapi.io/v2/fJulcG1ec0co-m6Vk0IVA7L8-fA7OAi5",
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: "K6NF4RQ9MP3F3V7ZVBGCET857X3RDJ1VDS",
  },
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
};
