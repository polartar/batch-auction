const { expect } = require("chai");
const {
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { BigNumber, utils } = require("ethers");
const balance = require("@openzeppelin/test-helpers/src/balance");
const {
  accounts,
  privateKeys,
  contract,
} = require("@openzeppelin/test-environment");
const EthCrypto = require("eth-crypto");
const { soliditySha3 } = require("web3-utils");

const BaseFixedPriceAuction = require("../artifacts/contracts/LevelingUpHeroesMagical.sol/LevelingUpHeroesMagical.json");
const PaymentSplitter = require("../artifacts/contracts/PaymentSplitter.sol/PaymentSplitter.json");

const [owner, other, other2, jon, ronald, eric] = accounts;

const [ownerKey, otherKey] = privateKeys;

const MAX = 10;
const PRICE = "5000000000000000000";
const ALLOW_LIST_MAX_MINT = 3;
const PUBLIC_LIST_MAX_MINT = 3;
const TOTAL_RESERVED_SUPPLY = 2;
const TOTAL_SALE_SUPPLY = 8;
const BASE_URI = "https://base.com/";
const REVEALED_URI = "https://revealed.com/";

const halfMax = parseInt(MAX / 2);
const halfAllowListMax = parseInt(ALLOW_LIST_MAX_MINT / 2);
const halfPublicListMax = parseInt(ALLOW_LIST_MAX_MINT / 2);

const TEST_VRF_COORDINATOR = "0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B";
const TEST_LINK_ADDRESS = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
const TEST_KEY_HASH =
  "0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311";

const secondsSinceEpoch = Math.round(new Date().getTime() / 1000);
const DECREASE_INTERVAL = 900;

const HASH_PREFIX = "Base Verification:";
// const tokenURIPrefix = "Lives of Asuna Token URI Verification:";
const mintWhitelistWithAmountPrefix =
  "Leveling Up Heroes Magical Whitelist Verification:";

before(async function () {
  this.Base = contract.fromABI(
    BaseFixedPriceAuction.abi,
    BaseFixedPriceAuction.bytecode
  );
  this.PaymentSplitter = contract.fromABI(
    PaymentSplitter.abi,
    PaymentSplitter.bytecode
  );
});

beforeEach(async function () {
  this.paymentSplitter = await this.PaymentSplitter.new(
    [jon, ronald, eric],
    [75, 15, 10]
  );

  this.base = await this.Base.new(
    [jon, ronald, eric],
    [75, 15, 10],
    "BaseFixedPriceAuctionTest",
    "BFPAT",
    ALLOW_LIST_MAX_MINT,
    0,
    TOTAL_SALE_SUPPLY,
    TOTAL_RESERVED_SUPPLY,
    BigNumber.from(PRICE),
    {
      from: owner,
    }
  );
});

async function getEthBalanceFromTracker(tracker) {
  return utils.formatEther((await tracker.get()).toString());
}

async function getEthDeltaFromTracker(tracker) {
  return utils.formatEther((await tracker.delta()).toString());
}

// Test case
it("cannot mint whitelist with a bad signature", async function () {
  const nonce = 1;
  const hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  const otherSignature = EthCrypto.sign(otherKey, hash);
  const ownerSignature = EthCrypto.sign(ownerKey, hash);

  await expectRevert(
    this.base.registerAndMintForWhitelist(hash, otherSignature, 1, nonce, {
      from: owner,
    }),
    "Signature invalid."
  );
});

it("cannot mint whitelist with bad hash", async function () {
  const nonce = 1;
  const badPrefixHash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    ["bad", owner, nonce]
  );

  const badAddressHash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, other, nonce]
  );

  const badNonceHash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, other, 2]
  );

  const badPrefixSignature = EthCrypto.sign(ownerKey, badPrefixHash);
  const badAddressSignature = EthCrypto.sign(ownerKey, badAddressHash);
  const badNonceSignature = EthCrypto.sign(ownerKey, badNonceHash);

  await expectRevert(
    this.base.registerAndMintForWhitelist(
      badPrefixHash,
      badPrefixSignature,
      1,
      nonce,
      {
        from: owner,
      }
    ),
    "Hash invalid."
  );

  await expectRevert(
    this.base.registerAndMintForWhitelist(
      badAddressHash,
      badAddressSignature,
      1,
      nonce,
      {
        from: owner,
      }
    ),
    "Hash invalid."
  );

  await expectRevert(
    this.base.registerAndMintForWhitelist(
      badNonceHash,
      badNonceSignature,
      1,
      nonce,
      {
        from: owner,
      }
    ),
    "Hash invalid."
  );
});

it("can mint whitelist", async function () {
  const nonce = 1;
  const hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  const ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
    from: owner,
    value: BigNumber.from(PRICE),
  });

  expect((await this.base.totalSupply()).toString()).to.equal("1");
});

it("cannot mint past whitelist limit", async function () {
  let nonce = 4;
  let hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  let ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
    from: owner,
    value: BigNumber.from(PRICE),
  });

  hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.registerAndMintForWhitelist(hash, ownerSignature, 2, nonce, {
    from: owner,
    value: BigNumber.from(PRICE).mul(2),
  });

  hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  ownerSignature = EthCrypto.sign(ownerKey, hash);

  await expectRevert(
    this.base.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
      from: owner,
      value: BigNumber.from(PRICE),
    }),
    "You cannot mint this many."
  );
});

it("cannot mint past whitelist limit", async function () {
  let nonce = 4;
  let hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  let ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
    from: owner,
    value: BigNumber.from(PRICE),
  });

  hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.registerAndMintForWhitelist(hash, ownerSignature, 2, nonce, {
    from: owner,
    value: BigNumber.from(PRICE).mul(2),
  });

  hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  ownerSignature = EthCrypto.sign(ownerKey, hash);

  await expectRevert(
    this.base.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
      from: owner,
      value: BigNumber.from(PRICE),
    }),
    "You cannot mint this many."
  );
});

it("cannot mint past whitelist limit in the hash", async function () {
  let nonce = 2;
  let hash = utils.solidityKeccak256(
    ["string", "address", "uint256"],
    [mintWhitelistWithAmountPrefix, owner, nonce]
  );

  let ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
    from: owner,
    value: BigNumber.from(PRICE),
  });

  await expectRevert(
    this.base.registerAndMintForWhitelist(hash, ownerSignature, 2, nonce, {
      from: owner,
      value: BigNumber.from(PRICE).mul(2),
    }),
    "You cannot mint this many."
  );

  await this.base.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
    from: owner,
    value: BigNumber.from(PRICE).mul(1),
  });
});

it("no tokens minted", async function () {
  expect((await this.base.totalSupply()).toString()).to.equal("0");
});

it("cannot mint while sale is inactive and can mint while sale is active", async function () {
  await expectRevert(
    this.base.mintPublic(1, { from: other }),
    "You cannot mint this many."
  );

  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await this.base.mintPublic(1, {
    from: other,
    value: BigNumber.from(PRICE),
  });

  await this.base.setPublicListMaxMint(0, { from: owner });

  await expectRevert(
    this.base.mintPublic(1, { from: other }),
    "You cannot mint this many."
  );
});

it("tokenURI is just tokenID without a base URI", async function () {
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await this.base.mintPublic(1, {
    from: other,
    value: BigNumber.from(PRICE),
  });

  expect(await this.base.tokenURI(0)).equal(`${0}`);
});

it("tokenURI is concatenated with a valid base URI which overrides the base URI", async function () {
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await this.base.mintPublic(1, {
    from: other,
    value: BigNumber.from(PRICE),
  });

  await expectRevert(
    this.base.setBaseURI(BASE_URI, { from: other }),
    "Ownable: caller is not the owner"
  );

  await this.base.setBaseURI(BASE_URI, { from: owner });

  expect(await this.base.tokenURI(0)).equal(`${BASE_URI}${0}`);
});

// it("cannot set tokenURI with a bad signature", async function () {
//   await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

//   const nonce = 0;
//   const hash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, owner, "test", nonce]
//   );

//   const otherSignature = EthCrypto.sign(otherKey, hash);
//   const ownerSignature = EthCrypto.sign(ownerKey, hash);

//   await this.base.mintPublic(1, {
//     from: owner,
//     value: BigNumber.from(PRICE),
//   });

//   await expectRevert(
//     this.base.setTokenURI(0, "test", nonce, hash, otherSignature),
//     "Signature invalid."
//   );
// });

// it("cannot unlock animation with zodiacs with bad hash", async function () {
//   await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

//   const nonce = 0;
//   const badPrefixHash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     ["bad", owner, "test", nonce]
//   );

//   const badAddressHash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, other, "test", nonce]
//   );

//   const badTokenURIHash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, other, "bad", nonce]
//   );

//   const badNonceHash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, other, "test", 1]
//   );

//   const badPrefixSignature = EthCrypto.sign(ownerKey, badPrefixHash);
//   const badAddressSignature = EthCrypto.sign(ownerKey, badAddressHash);
//   const badTokenURISignature = EthCrypto.sign(ownerKey, badTokenURIHash);
//   const badNonceSignature = EthCrypto.sign(ownerKey, badNonceHash);

//   await this.base.mintPublic(1, {
//     from: owner,
//     value: BigNumber.from(PRICE),
//   });

//   await expectRevert(
//     this.base.setTokenURI(0, "test", nonce, badPrefixHash, badPrefixSignature),
//     "Hash invalid."
//   );

//   await expectRevert(
//     this.base.setTokenURI(
//       0,
//       "test",
//       nonce,
//       badAddressHash,
//       badAddressSignature
//     ),
//     "Hash invalid."
//   );

//   await expectRevert(
//     this.base.setTokenURI(
//       0,
//       "test",
//       nonce,
//       badTokenURIHash,
//       badTokenURISignature
//     ),
//     "Hash invalid."
//   );

//   await expectRevert(
//     this.base.setTokenURI(0, "test", nonce, badNonceHash, badNonceSignature),
//     "Hash invalid."
//   );
// });

// it("can set tokenURI with a correct signature", async function () {
//   await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

//   let nonce = 0;
//   let hash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, owner, "test", nonce]
//   );

//   let ownerSignature = EthCrypto.sign(ownerKey, hash);

//   await this.base.mintPublic(1, {
//     from: owner,
//     value: BigNumber.from(PRICE),
//   });

//   expect(await this.base.tokenURI(0)).equal(`${0}`);

//   await this.base.setBaseURI(BASE_URI, { from: owner });

//   expect(await this.base.tokenURI(0)).equal(`${BASE_URI}${0}`);

//   await this.base.setTokenURI(0, "test", nonce, hash, ownerSignature, {
//     from: owner,
//   });

//   expect(await this.base.tokenURI(0)).equal(`${"test"}`);

//   nonce = 1;
//   hash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, owner, "", nonce]
//   );

//   ownerSignature = EthCrypto.sign(ownerKey, hash);

//   await this.base.setTokenURI(0, "", nonce, hash, ownerSignature, {
//     from: owner,
//   });

//   expect(await this.base.tokenURI(0)).equal(`${BASE_URI}${0}`);
// });

// it("cannot set tokenURI with a reused nonce", async function () {
//   await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

//   let nonce = 0;
//   let hash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, owner, "test", nonce]
//   );

//   let ownerSignature = EthCrypto.sign(ownerKey, hash);

//   await this.base.mintPublic(1, {
//     from: owner,
//     value: BigNumber.from(PRICE),
//   });

//   await this.base.setTokenURI(0, "test", nonce, hash, ownerSignature, {
//     from: owner,
//   });

//   await expectRevert(
//     this.base.setTokenURI(0, "test", nonce, hash, ownerSignature, {
//       from: owner,
//     }),
//     "Nonce already used."
//   );
// });

// it("cannot set tokenURI with a token you do not own", async function () {
//   await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

//   let nonce = 0;
//   let hash = utils.solidityKeccak256(
//     ["string", "address", "string", "uint256"],
//     [tokenURIPrefix, owner, "test", nonce]
//   );

//   let ownerSignature = EthCrypto.sign(ownerKey, hash);

//   await this.base.mintPublic(1, {
//     from: owner,
//     value: BigNumber.from(PRICE),
//   });

//   await this.base.mintPublic(1, {
//     from: other,
//     value: BigNumber.from(PRICE),
//   });

//   await expectRevert(
//     this.base.setTokenURI(1, "test", nonce, hash, ownerSignature, {
//       from: owner,
//     }),
//     "You do not own this token."
//   );
// });

// it("only owner can enable sale state", async function () {
//   await expectRevert(
//     this.base.setPublicListMaxMint(1, { from: other }),
//     "Ownable: caller is not the owner"
//   );
// });

// it("only owner can mint reserved nfts and mints up to reserved limit", async function () {
//   await expectRevert(
//     this.base.mintReserved(TOTAL_RESERVED_SUPPLY, { from: other }),
//     "Ownable: caller is not the owner"
//   );

//   await this.base.mintReserved(TOTAL_RESERVED_SUPPLY, { from: owner });

//   expect((await this.base.totalSupply()).toString()).to.equal("2");
// });

it("cannot mint more than max count", async function () {
  ({ from: owner });

  await this.base.setPublicListMaxMint(MAX + 1, { from: owner });

  await this.base.mintPublic(4, {
    from: owner,
    value: BigNumber.from(PRICE).mul(4),
  });

  await this.base.mintPublic(4, {
    from: owner,
    value: BigNumber.from(PRICE).mul(4),
  });

  await expectRevert(
    this.base.mintPublic(3, {
      from: owner,
      value: BigNumber.from(PRICE).mul(3),
    }),
    "Sold out."
  );

  await this.base.mintPublic(2, {
    from: owner,
    value: BigNumber.from(PRICE).mul(2),
  });
});

it("cannot purchase tokens with insufficient ether", async function () {
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await expectRevert(this.base.mintPublic(1), "Invalid amount.");
});

it("can purchase tokens with sufficient ether", async function () {
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE),
  });
});

it("cannot purchase multiple tokens with insufficient ether", async function () {
  ({ from: owner });
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await expectRevert(
    this.base.mintPublic(2, {
      value: BigNumber.from(PRICE),
    }),
    "Invalid amount."
  );
});

it("can purchase multiple tokens with sufficient ether", async function () {
  ({ from: owner });
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await this.base.mintPublic(halfPublicListMax, {
    value: BigNumber.from(PRICE).mul(halfPublicListMax),
  });
});

it("cannot mint more than public list max and can increase limit", async function () {
  ({ from: owner });
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
  });

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
  });

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
  });

  await expectRevert(
    this.base.mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
    }),
    "You cannot mint this many."
  );

  await expectRevert(
    this.base.setPublicListMaxMint(4, { from: other }),
    "Ownable: caller is not the owner"
  );

  this.base.setPublicListMaxMint(4, { from: owner });

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
  });
});

it("whitelist denies users not on whitelist", async function () {
  const hash = soliditySha3(HASH_PREFIX, other2);

  const otherSignature = EthCrypto.sign(otherKey, hash);

  await expectRevert(
    this.base.mintWhitelist(hash, otherSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other,
    }),
    "This hash's signature is invalid."
  );

  const ownerSignature = EthCrypto.sign(ownerKey, hash);

  await expectRevert(
    this.base.mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other,
    }),
    "The address hash does not match the signed hash."
  );
});

it("cannot replay attack hashes", async function () {
  const hash = soliditySha3(HASH_PREFIX, other);

  const ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await this.base.setPrefix("Public Sale Verification:", {
    from: owner,
  });

  await expectRevert(
    this.base.mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other,
    }),
    "The address hash does not match the signed hash."
  );

  const newHash = soliditySha3("Public Sale Verification:", other);
  const newOwnerSignature = EthCrypto.sign(ownerKey, newHash);

  await this.base.mintWhitelist(newHash, newOwnerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });
});

it("whitelist allows users on whitelist", async function () {
  const hash = soliditySha3(HASH_PREFIX, other);

  const ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });
});

it("whitelisted users cannot mint past whitelist limit", async function () {
  const hash = soliditySha3(HASH_PREFIX, other);

  const ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await expectRevert(
    this.base.mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other,
    }),
    "You cannot mint this many."
  );
});

// it("whitelist cap is independent of public cap", async function () {
//   const hash = soliditySha3(HASH_PREFIX, other);

//   const ownerSignature = EthCrypto.sign(ownerKey, hash);
//   await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

//   await this.base.mintWhitelist(hash, ownerSignature, 1, {
//     value: BigNumber.from(PRICE),
//     from: other,
//   });

//   await this.base.mintWhitelist(hash, ownerSignature, 1, {
//     value: BigNumber.from(PRICE),
//     from: other,
//   });

//   await this.base.mintWhitelist(hash, ownerSignature, 1, {
//     value: BigNumber.from(PRICE),
//     from: other,
//   });

//   await expectRevert(
//     this.base.mintWhitelist(hash, ownerSignature, 1, {
//       value: BigNumber.from(PRICE),
//       from: other,
//     }),
//     "You cannot mint this many."
//   );

//   ({ from: owner });

//   await this.base.mintPublic(1, {
//     from: other,
//     value: BigNumber.from(PRICE),
//   });

//   await this.base.mintPublic(1, {
//     from: other,
//     value: BigNumber.from(PRICE),
//   });

//   await this.base.mintPublic(1, {
//     from: other,
//     value: BigNumber.from(PRICE),
//   });

//   await expectRevert(
//     this.base.mintPublic(1, {
//       from: other,
//       value: BigNumber.from(PRICE),
//     }),
//     "You cannot mint this many."
//   );
// });

it("whitelist cap is not independent of public cap", async function () {
  const hash = soliditySha3(HASH_PREFIX, other);

  const ownerSignature = EthCrypto.sign(ownerKey, hash);
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await expectRevert(
    this.base.mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other,
    }),
    "You cannot mint this many."
  );

  await expectRevert(
    this.base.mintPublic(1, {
      from: other,
      value: BigNumber.from(PRICE),
    }),
    "You cannot mint this many."
  );
});

it("whitelist max mints can be adjusted", async function () {
  const hash = soliditySha3(HASH_PREFIX, other);

  const ownerSignature = EthCrypto.sign(ownerKey, hash);

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });

  await expectRevert(
    this.base.mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other,
    }),
    "You cannot mint this many."
  );

  await expectRevert(
    this.base.setWhitelistMaxMint(4, { from: other }),
    "Ownable: caller is not the owner"
  );

  this.base.setWhitelistMaxMint(4, { from: owner });

  await this.base.mintWhitelist(hash, ownerSignature, 1, {
    value: BigNumber.from(PRICE),
    from: other,
  });
});

it("payment splitter releases nothing in the beginning", async function () {
  await expectRevert(
    this.base.release(jon, { from: owner }),
    "PaymentSplitter: account is not due payment."
  );
  await expectRevert(
    this.base.release(ronald, { from: owner }),
    "PaymentSplitter: account is not due payment."
  );
  await expectRevert(
    this.base.release(eric, { from: owner }),
    "PaymentSplitter: account is not due payment."
  );
});

it("payment split correctly releases money after one mint and refuses to pay out duplicate calls", async function () {
  ({ from: owner });
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  const jonTracker = await balance.tracker(jon, "wei");
  const ronaldTracker = await balance.tracker(ronald, "wei");
  const ericTracker = await balance.tracker(eric, "wei");

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
    from: other,
  });

  expect(await getEthDeltaFromTracker(jonTracker)).to.equal("0.0");
  expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.0");
  expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.0");

  await this.base.splitPayments({ from: owner });

  await this.base.release(jon, { from: owner });
  await this.base.release(ronald, { from: owner });
  await this.base.release(eric, { from: owner });

  expect(await getEthDeltaFromTracker(jonTracker)).to.equal("3.75");
  expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.75");
  expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.5");

  await expectRevert(
    this.base.release(jon, { from: owner }),
    "PaymentSplitter: account is not due payment."
  );
  await expectRevert(
    this.base.release(ronald, { from: owner }),
    "PaymentSplitter: account is not due payment."
  );
  await expectRevert(
    this.base.release(eric, { from: owner }),
    "PaymentSplitter: account is not due payment."
  );

  expect(await getEthDeltaFromTracker(jonTracker)).to.equal("0.0");
  expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.0");
  expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.0");
});

it("payment splitter will not payout accounts that weren't assigned to it", async function () {
  ({ from: owner });
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  const jonTracker = await balance.tracker(jon, "wei");
  const ronaldTracker = await balance.tracker(ronald, "wei");
  const ericTracker = await balance.tracker(eric, "wei");

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
    from: other,
  });

  await expectRevert(
    this.base.release(other, { from: owner }),
    "PaymentSplitter: account has no shares"
  );
});

it("payment splitter will pay out again after a second mint", async function () {
  ({ from: owner });
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  const jonTracker = await balance.tracker(jon, "wei");
  const ronaldTracker = await balance.tracker(ronald, "wei");
  const ericTracker = await balance.tracker(eric, "wei");

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
    from: other,
  });

  await this.base.splitPayments({ from: owner });

  await this.base.release(jon, { from: owner });
  await this.base.release(ronald, { from: owner });
  await this.base.release(eric, { from: owner });

  expect(await getEthDeltaFromTracker(jonTracker)).to.equal("3.75");
  expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.75");
  expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.5");

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
    from: other,
  });

  await this.base.splitPayments({ from: owner });

  await this.base.release(jon, { from: owner });
  await this.base.release(ronald, { from: owner });
  await this.base.release(eric, { from: owner });

  expect(await getEthDeltaFromTracker(jonTracker)).to.equal("3.75");
  expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.75");
  expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.5");
});

it("payment splitter will pay out everything after multiple mints", async function () {
  ({ from: owner });
  await this.base.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  const jonTracker = await balance.tracker(jon, "wei");
  const ronaldTracker = await balance.tracker(ronald, "wei");
  const ericTracker = await balance.tracker(eric, "wei");

  await this.base.mintPublic(1, {
    value: BigNumber.from(PRICE).mul(1),
    from: other,
  });

  await this.base.mintPublic(2, {
    value: BigNumber.from(PRICE).mul(2),
    from: other,
  });

  await this.base.splitPayments({ from: owner });

  await this.base.release(jon, { from: owner });
  await this.base.release(ronald, { from: owner });
  await this.base.release(eric, { from: owner });

  expect(await getEthDeltaFromTracker(jonTracker)).to.equal("11.25");
  expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("2.25");
  expect(await getEthDeltaFromTracker(ericTracker)).to.equal("1.5");
});
