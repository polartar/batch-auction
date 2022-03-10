const { expect } = require("chai");
const { ethers, upgrades  } = require("hardhat");
const parseEther = ethers.utils.parseEther;
const {
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");

describe("Test Offer contract", function () {
  let baseDEUFactory;

  let baseDEU;
  let mockMarket;
  let accounts;
  let owner, other, other2, jon, ronald, eric;
  
  const MAX = 10;
  const PRICE = "5000000000000000000";
  const PRICE_DISCOUNTED = "2000000000000000000";
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

  const HASH_PREFIX = "Leveling Up Heroes Epic Base Verification:";
  const HASH_PREFIX_DISCOUNTED =
    "Leveling Up Heroes Epic Discounted Verification:";

  before(async() => {
    accounts = await ethers.getSigners();
    [owner, other, other2, jon, ronald, eric] = accounts.map(account => account.address);
    baseDEUFactory = await ethers.getContractFactory("BaseDutchAuctionERC721AUpgradable");
 })

  beforeEach(async function () {
    baseDEU = await upgrades.deployProxy(
      baseDEUFactory,
      [
        [jon, ronald, eric],
        [75, 15, 10],
        "BaseDutchAuctionTest",
        "BDAT",
        ALLOW_LIST_MAX_MINT,
        0,
        TOTAL_SALE_SUPPLY,
        TOTAL_RESERVED_SUPPLY,
        PRICE_DISCOUNTED,
      ]
    );

    await baseDEU.deployed();
  })

  it('should only let admin upgrade', async () => {
    // await offerContract.grantRole(await offerContract.UPGRADER_ROLE(), accounts[1].address);

    // let v2 = await ethers.getContractFactory("Offer2Contract", accounts[2]);
    // await expect(upgrades.upgradeProxy(offerContract.address, v2)).to.be.reverted;
    
    // v2 = await ethers.getContractFactory("Offer2Contract", accounts[1]);
    // const upgrade = await upgrades.upgradeProxy(offerContract.address, v2);
    // await expect(await upgrade.name()).to.eq("v2");
  })
  
  it("only owner can mint reserved nfts and mints up to reserved limit", async function () {
    // await expectRevert(
    //   baseDEU.mintReserved(TOTAL_RESERVED_SUPPLY, { from: other }),
    //   "Ownable: caller is not the owner"
    // );

    await expect( baseDEU.connect(accounts[1]).mintReserved(TOTAL_RESERVED_SUPPLY)).to.be.revertedWith("Ownable: caller is not the owner");
  
    await baseDEU.mintReserved(TOTAL_RESERVED_SUPPLY);
  
    expect((await baseDEU.totalSupply()).toString()).to.equal("2");
  });
  
  // it("no tokens minted", async function () {
  //   expect((await baseDEU.totalSupply()).toString()).to.equal("0");
  // });
  
  // it("cannot mint while sale is inactive and can mint while sale is active", async function () {
  //   await expectRevert(
  //     baseDEU.mintPublic(1, { from: other }),
  //     "You cannot mint this many."
  //   );
  
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from(PRICE),
  //   });
  
  //   await baseDEU.setPublicListMaxMint(0, { from: owner });
  
  //   await expectRevert(
  //     baseDEU.mintPublic(1, { from: other }),
  //     "You cannot mint this many."
  //   );
  // });
  
  // it("tokenURI is just tokenID without a base URI", async function () {
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from(PRICE),
  //   });
  
  //   expect(await baseDEU.tokenURI(TOTAL_RESERVED_SUPPLY + 1)).equal(
  //     `${TOTAL_RESERVED_SUPPLY + 1}`
  //   );
  // });
  
  // it("tokenURI is concatenated with a valid base URI which overrides the base URI", async function () {
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from(PRICE),
  //   });
  
  //   await expectRevert(
  //     baseDEU.setBaseURI(BASE_URI, { from: other }),
  //     "Ownable: caller is not the owner"
  //   );
  
  //   await baseDEU.setBaseURI(BASE_URI, { from: owner });
  
  //   expect(await baseDEU.tokenURI(TOTAL_RESERVED_SUPPLY + 1)).equal(
  //     `${BASE_URI}${TOTAL_RESERVED_SUPPLY + 1}`
  //   );
  // });
  
  // it("only owner can enable sale state", async function () {
  //   await expectRevert(
  //     baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: other }),
  //     "Ownable: caller is not the owner"
  //   );
  // });
  
  // it("cannot mint more than max count", async function () {
  //   ({ from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  //   await baseDEU.setPublicListMaxMint(MAX + 1, { from: owner });
  
  //   await baseDEU.mintPublic(halfMax, {
  //     from: owner,
  //     value: BigNumber.from(PRICE).mul(halfMax),
  //   });
  
  //   await expectRevert(
  //     baseDEU.mintPublic(halfMax + 1, {
  //       from: owner,
  //       value: BigNumber.from(PRICE).mul(halfMax + 1),
  //     }),
  //     "Sold out."
  //   );
  
  //   await baseDEU.mintPublic(halfMax, {
  //     from: owner,
  //     value: BigNumber.from(PRICE).mul(halfMax),
  //   });
  // });
  
  // it("cannot purchase tokens with insufficient ether", async function () {
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await expectRevert(baseDEU.mintPublic(1), "Invalid amount.");
  // });
  
  // it("can purchase tokens with sufficient ether", async function () {
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE),
  //   });
  // });
  
  // it("cannot purchase multiple tokens with insufficient ether", async function () {
  //   ({ from: owner });
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  //   await expectRevert(
  //     baseDEU.mintPublic(2, {
  //       value: BigNumber.from(PRICE),
  //     }),
  //     "Invalid amount."
  //   );
  // });
  
  // it("can purchase multiple tokens with sufficient ether", async function () {
  //   ({ from: owner });
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintPublic(halfPublicListMax, {
  //     value: BigNumber.from(PRICE).mul(halfPublicListMax),
  //   });
  // });
  
  // it("cannot mint more than public list max and can increase limit", async function () {
  //   ({ from: owner });
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //   });
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //   });
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //   });
  
  //   await expectRevert(
  //     baseDEU.mintPublic(1, {
  //       value: BigNumber.from(PRICE).mul(1),
  //     }),
  //     "You cannot mint this many."
  //   );
  
  //   await expectRevert(
  //     baseDEU.setPublicListMaxMint(4, { from: other }),
  //     "Ownable: caller is not the owner"
  //   );
  
  //   baseDEU.setPublicListMaxMint(4, { from: owner });
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //   });
  // });
  
  // it("whitelist denies users not on whitelist", async function () {
  //   const hash = soliditySha3(HASH_PREFIX, other2);
  
  //   const otherSignature = EthCrypto.sign(otherKey, hash);
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await expectRevert(
  //     baseDEU.mintWhitelist(hash, otherSignature, 1, {
  //       value: BigNumber.from(PRICE),
  //       from: other,
  //     }),
  //     "This hash's signature is invalid."
  //   );
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  
  //   await expectRevert(
  //     baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //       value: BigNumber.from(PRICE),
  //       from: other,
  //     }),
  //     "The address hash does not match the signed hash."
  //   );
  // });
  
  // it("cannot replay attack hashes", async function () {
  //   const hash = soliditySha3(HASH_PREFIX, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await baseDEU.setPrefix("Public Sale Verification:", {
  //     from: owner,
  //   });
  
  //   await expectRevert(
  //     baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //       value: BigNumber.from(PRICE),
  //       from: other,
  //     }),
  //     "The address hash does not match the signed hash."
  //   );
  
  //   const newHash = soliditySha3("Public Sale Verification:", other);
  //   const newOwnerSignature = EthCrypto.sign(ownerKey, newHash);
  
  //   await baseDEU.mintWhitelist(newHash, newOwnerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  // });
  
  // it("whitelist allows users on whitelist", async function () {
  //   const hash = soliditySha3(HASH_PREFIX, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  // });
  
  // it("whitelisted users cannot mint past whitelist limit", async function () {
  //   const hash = soliditySha3(HASH_PREFIX, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await expectRevert(
  //     baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //       value: BigNumber.from(PRICE),
  //       from: other,
  //     }),
  //     "You cannot mint this many."
  //   );
  // });
  
  // // it("whitelist cap is independent of public cap", async function () {
  // //   const hash = soliditySha3(HASH_PREFIX, other);
  
  // //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  // //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  // //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  // //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  // //     value: BigNumber.from(PRICE),
  // //     from: other,
  // //   });
  
  // //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  // //     value: BigNumber.from(PRICE),
  // //     from: other,
  // //   });
  
  // //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  // //     value: BigNumber.from(PRICE),
  // //     from: other,
  // //   });
  
  // //   await expectRevert(
  // //     baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  // //       value: BigNumber.from(PRICE),
  // //       from: other,
  // //     }),
  // //     "You cannot mint this many."
  // //   );
  
  // //   ({ from: owner });
  
  // //   await baseDEU.mintPublic(1, {
  // //     from: other,
  // //     value: BigNumber.from(PRICE),
  // //   });
  
  // //   await baseDEU.mintPublic(1, {
  // //     from: other,
  // //     value: BigNumber.from(PRICE),
  // //   });
  
  // //   await baseDEU.mintPublic(1, {
  // //     from: other,
  // //     value: BigNumber.from(PRICE),
  // //   });
  
  // //   await expectRevert(
  // //     baseDEU.mintPublic(1, {
  // //       from: other,
  // //       value: BigNumber.from(PRICE),
  // //     }),
  // //     "You cannot mint this many."
  // //   );
  // // });
  
  // it("whitelist cap contributes to public cap", async function () {
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   const hash = soliditySha3(HASH_PREFIX_DISCOUNTED, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintWhitelistDiscounted(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE_DISCOUNTED),
  //     from: other,
  //   });
  
  //   await baseDEU.mintWhitelistDiscounted(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE_DISCOUNTED),
  //     from: other,
  //   });
  
  //   await baseDEU.mintWhitelistDiscounted(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE_DISCOUNTED),
  //     from: other,
  //   });
  
  //   await expectRevert(
  //     baseDEU.mintPublic(1, {
  //       from: other,
  //       value: BigNumber.from(PRICE),
  //     }),
  //     "You cannot mint this many."
  //   );
  // });
  
  // it("whitelist max mints can be adjusted", async function () {
  //   const hash = soliditySha3(HASH_PREFIX, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await expectRevert(
  //     baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //       value: BigNumber.from(PRICE),
  //       from: other,
  //     }),
  //     "You cannot mint this many."
  //   );
  
  //   await expectRevert(
  //     baseDEU.setWhitelistMaxMint(4, { from: other }),
  //     "Ownable: caller is not the owner"
  //   );
  
  //   baseDEU.setWhitelistMaxMint(4, { from: owner });
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  // });
  
  // it("whitelist discounted mint allows whitelisted users with proper price", async function () {
  //   const hash = soliditySha3(HASH_PREFIX_DISCOUNTED, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintWhitelistDiscounted(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE_DISCOUNTED),
  //     from: other,
  //   });
  // });
  
  // it("whitelist discounted mint allows whitelisted users with improper price", async function () {
  //   const hash = soliditySha3(HASH_PREFIX_DISCOUNTED, other);
  //   const wrongHash = soliditySha3(HASH_PREFIX, other);
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   const wrongOwnerSignature = EthCrypto.sign(ownerKey, wrongHash);
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await baseDEU.mintWhitelistDiscounted(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE_DISCOUNTED),
  //     from: other,
  //   });
  
  //   await expectRevert(
  //     baseDEU.mintWhitelistDiscounted(hash, ownerSignature, 1, {
  //       value: BigNumber.from("1"),
  //       from: other,
  //     }),
  //     "Invalid amount."
  //   );
  
  //   await expectRevert(
  //     baseDEU.mintWhitelistDiscounted(wrongHash, wrongOwnerSignature, 1, {
  //       value: BigNumber.from(PRICE_DISCOUNTED),
  //       from: other,
  //     }),
  //     "The address hash does not match the signed hash."
  //   );
  // });
  
  // it("payment splitter releases nothing in the beginning", async function () {
  //   await expectRevert(
  //     baseDEU.release(jon, { from: owner }),
  //     "PaymentSplitter: account is not due payment."
  //   );
  //   await expectRevert(
  //     baseDEU.release(ronald, { from: owner }),
  //     "PaymentSplitter: account is not due payment."
  //   );
  //   await expectRevert(
  //     baseDEU.release(eric, { from: owner }),
  //     "PaymentSplitter: account is not due payment."
  //   );
  // });
  
  // it("payment split correctly releases money after one mint and refuses to pay out duplicate calls", async function () {
  //   ({ from: owner });
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  //   const jonTracker = await balance.tracker(jon, "wei");
  //   const ronaldTracker = await balance.tracker(ronald, "wei");
  //   const ericTracker = await balance.tracker(eric, "wei");
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //     from: other,
  //   });
  
  //   expect(await getEthDeltaFromTracker(jonTracker)).to.equal("0.0");
  //   expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.0");
  //   expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.0");
  
  //   await baseDEU.splitPayments({ from: owner });
  
  //   await baseDEU.release(jon, { from: owner });
  //   await baseDEU.release(ronald, { from: owner });
  //   await baseDEU.release(eric, { from: owner });
  
  //   expect(await getEthDeltaFromTracker(jonTracker)).to.equal("3.75");
  //   expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.75");
  //   expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.5");
  
  //   await expectRevert(
  //     baseDEU.release(jon, { from: owner }),
  //     "PaymentSplitter: account is not due payment."
  //   );
  //   await expectRevert(
  //     baseDEU.release(ronald, { from: owner }),
  //     "PaymentSplitter: account is not due payment."
  //   );
  //   await expectRevert(
  //     baseDEU.release(eric, { from: owner }),
  //     "PaymentSplitter: account is not due payment."
  //   );
  
  //   expect(await getEthDeltaFromTracker(jonTracker)).to.equal("0.0");
  //   expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.0");
  //   expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.0");
  // });
  
  // it("payment splitter will not payout accounts that weren't assigned to it", async function () {
  //   ({ from: owner });
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   const jonTracker = await balance.tracker(jon, "wei");
  //   const ronaldTracker = await balance.tracker(ronald, "wei");
  //   const ericTracker = await balance.tracker(eric, "wei");
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //     from: other,
  //   });
  
  //   await expectRevert(
  //     baseDEU.release(other, { from: owner }),
  //     "PaymentSplitter: account has no shares"
  //   );
  // });
  
  // it("payment splitter will pay out again after a second mint", async function () {
  //   ({ from: owner });
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   const jonTracker = await balance.tracker(jon, "wei");
  //   const ronaldTracker = await balance.tracker(ronald, "wei");
  //   const ericTracker = await balance.tracker(eric, "wei");
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //     from: other,
  //   });
  
  //   await baseDEU.splitPayments({ from: owner });
  
  //   await baseDEU.release(jon, { from: owner });
  //   await baseDEU.release(ronald, { from: owner });
  //   await baseDEU.release(eric, { from: owner });
  
  //   expect(await getEthDeltaFromTracker(jonTracker)).to.equal("3.75");
  //   expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.75");
  //   expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.5");
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //     from: other,
  //   });
  
  //   await baseDEU.splitPayments({ from: owner });
  
  //   await baseDEU.release(jon, { from: owner });
  //   await baseDEU.release(ronald, { from: owner });
  //   await baseDEU.release(eric, { from: owner });
  
  //   expect(await getEthDeltaFromTracker(jonTracker)).to.equal("3.75");
  //   expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("0.75");
  //   expect(await getEthDeltaFromTracker(ericTracker)).to.equal("0.5");
  // });
  
  // it("payment splitter will pay out everything after multiple mints", async function () {
  //   ({ from: owner });
  //   await baseDEU.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   const jonTracker = await balance.tracker(jon, "wei");
  //   const ronaldTracker = await balance.tracker(ronald, "wei");
  //   const ericTracker = await balance.tracker(eric, "wei");
  
  //   await baseDEU.mintPublic(1, {
  //     value: BigNumber.from(PRICE).mul(1),
  //     from: other,
  //   });
  
  //   await baseDEU.mintPublic(2, {
  //     value: BigNumber.from(PRICE).mul(2),
  //     from: other,
  //   });
  
  //   await baseDEU.splitPayments({ from: owner });
  
  //   await baseDEU.release(jon, { from: owner });
  //   await baseDEU.release(ronald, { from: owner });
  //   await baseDEU.release(eric, { from: owner });
  
  //   expect(await getEthDeltaFromTracker(jonTracker)).to.equal("11.25");
  //   expect(await getEthDeltaFromTracker(ronaldTracker)).to.equal("2.25");
  //   expect(await getEthDeltaFromTracker(ericTracker)).to.equal("1.5");
  // });
  
  // it("dutch auction properly decreases price", async function () {
  //   ({ from: owner });
  //   await baseDEU.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  //   await baseDEU.setPublicListMaxMint(MAX + 1, { from: owner });
  
  //   await expectRevert(
  //     baseDEU.mintPublic(1, {
  //       from: other,
  //       value: BigNumber.from("4500000000000000000"),
  //     }),
  //     "Invalid amount."
  //   );
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await expectRevert(
  //     baseDEU.mintPublic(1, {
  //       from: other,
  //       value: BigNumber.from("4000000000000000000"),
  //     }),
  //     "Invalid amount."
  //   );
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from("3500000000000000000"),
  //   });
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from("3000000000000000000"),
  //   });
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from("2500000000000000000"),
  //   });
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from("2000000000000000000"),
  //   });
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from("1500000000000000000"),
  //   });
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from("1000000000000000000"),
  //   });
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   await baseDEU.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from("500000000000000000"),
  //   });
  
  //   await time.increase(time.duration.seconds(DECREASE_INTERVAL));
  
  //   const hash = soliditySha3(HASH_PREFIX, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  
  //   await baseDEU.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  // });
  
}); 

