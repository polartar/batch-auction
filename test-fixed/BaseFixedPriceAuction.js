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

const BaseFixedPriceAuction = require("../artifacts/contracts/BaseFixedPriceAuction.sol/BaseFixedPriceAuction.json");
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

  expect(await this.base.tokenURI(TOTAL_RESERVED_SUPPLY + 1)).equal(
    `${TOTAL_RESERVED_SUPPLY + 1}`
  );
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

  expect(await this.base.tokenURI(TOTAL_RESERVED_SUPPLY + 1)).equal(
    `${BASE_URI}${TOTAL_RESERVED_SUPPLY + 1}`
  );
});

it("only owner can enable sale state", async function () {
  await expectRevert(
    this.base.setPublicListMaxMint(1, { from: other }),
    "Ownable: caller is not the owner"
  );
});

it("only owner can mint reserved nfts and mints up to reserved limit", async function () {
  await expectRevert(
    this.base.mintReserved({ from: other }),
    "Ownable: caller is not the owner"
  );

  await this.base.mintReserved({ from: owner });

  expect((await this.base.totalSupply()).toString()).to.equal("2");
});

it("cannot mint more than max count", async function () {
  ({ from: owner });

  await this.base.setPublicListMaxMint(MAX + 1, { from: owner });

  await this.base.mintPublic(halfMax, {
    from: owner,
    value: BigNumber.from(PRICE).mul(halfMax),
  });

  await expectRevert(
    this.base.mintPublic(halfMax + 1, {
      from: owner,
      value: BigNumber.from(PRICE).mul(halfMax + 1),
    }),
    "Sold out."
  );
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

it("whitelist cap is independent of public cap", async function () {
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

  ({ from: owner });

  await this.base.mintPublic(1, {
    from: other,
    value: BigNumber.from(PRICE),
  });

  await this.base.mintPublic(1, {
    from: other,
    value: BigNumber.from(PRICE),
  });

  await this.base.mintPublic(1, {
    from: other,
    value: BigNumber.from(PRICE),
  });

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
