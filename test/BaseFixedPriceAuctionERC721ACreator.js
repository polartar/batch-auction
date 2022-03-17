const { expect, assert } = require("chai");
const { ethers, upgrades  } = require("hardhat");
const parseEther = ethers.utils.parseEther;
const { BigNumber } = require("ethers");

function getHash(message, address, nonce) {
  let messageHash;
  if (nounce) {
    messageHash = ethers.utils.solidityKeccak256(
        ["string", "address", "uint256"],
        [message, address, nonce]
    );
  } else {
    messageHash = ethers.utils.solidityKeccak256(
      ["string", "address"],
      [message, address]
  );
  }
  let messageHashBinary = ethers.utils.arrayify(messageHash);
  return messageHashBinary
}

describe("Test BaseDutchAuctionERC721ACreator contract", function () {
  let auctionCreatorFactory;
  let auctionFactory;

  let auctionCreator;
  let auctionBeacon;
  let auction;
  let accounts;
  let owner, other, other2, jon, ronald, eric;

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
    accounts = await ethers.getSigners();
    [owner, other, other2, jon, ronald, eric] = accounts;
    auctionFactory = await ethers.getContractFactory("BaseFixedPriceAuctionERC721AUpgradeable");
    auctionBeacon = await upgrades.deployBeacon(auctionFactory);
   
    auctionCreatorFactory = await ethers.getContractFactory("BaseFixedPriceAuctionERC721ACreator");
    auctionCreator = await upgrades.deployProxy(auctionCreatorFactory, [auctionBeacon.address], {kind : "uups"});
    await auctionCreator.deployed();
    
  });

  beforeEach(async function () {
    await auctionCreator.createAuction(
      [jon.address, ronald.address, eric.address],
      [75, 15, 10],
      "BaseFixedPriceAuctionTest",
      "BFPAT",
      ALLOW_LIST_MAX_MINT,
      0,
      TOTAL_SALE_SUPPLY,
      TOTAL_RESERVED_SUPPLY,
      PRICE,
    )

    const auctionAddress = await auctionCreator.getAuction(++index)
    auction = await auctionFactory.attach(auctionAddress);
  });

  it('should only let admin upgrade the auction creator', async () => {
    let v2 = await ethers.getContractFactory("BaseFixedPriceAuctionERC721ACreator2", other);
    await expect(upgrades.upgradeProxy(auctionCreator.address, v2)).to.be.reverted;
    
    v2 = await ethers.getContractFactory("BaseFixedPriceAuctionERC721ACreator2", owner);
    const upgrade = await upgrades.upgradeProxy(auctionCreator.address, v2);
    await expect(await upgrade.updatedFunction()).to.eq("v2");
  })
  
  it('should only let admin upgrade the auction', async () => {
    const v2Factory = await ethers.getContractFactory("BaseFixedPriceAuctionERC721AUpgradeable2");
    const v2 = await v2Factory.deploy();
    await v2.deployed();

    await expect(auctionBeacon.connect(other).upgradeTo(v2.address)).to.be.reverted;

    await auctionBeacon.upgradeTo(v2.address);
    auction = await v2Factory.attach(auction.address);
    await expect(await auction.updatedFunction()).to.eq("v2");

  })

  // Test case
  it("cannot mint whitelist with a bad signature", async function () {
    const nonce = 1;
    const hash = getHash(mintWhitelistWithAmountPrefix, owner.address, nonce);

    const otherSignature = await other.signMessage(hash);
   
    await expect(
      auction.registerAndMintForWhitelist(hash, otherSignature, 1, nonce)
    ).to.be.revertedWith("Signature invalid.");
  });

  it("cannot mint whitelist with bad hash", async function () {
    const nonce = 1;

    const badPrefixHash = getHash("bad", owner.address, nonce);
    const badAddressHash = getHash(mintWhitelistWithAmountPrefix, other.address, nonce);
    const badNonceHash = getHash(mintWhitelistWithAmountPrefix, other.address, 2);
 
    const badPrefixSignature = await other.signMessage(badPrefixHash);
    const badAddressSignature = await owner.signMessage(badAddressHash);
    const badNonceSignature = await owner.signMessage(badNonceHash);

    await expect(
      auction.registerAndMintForWhitelist(badPrefixHash, badPrefixSignature, 1, nonce)
    ).to.be.revertedWith("Hash invalid.");
    
    await expect(
      auction.registerAndMintForWhitelist(badAddressHash, badAddressSignature, 1, nonce)
    ).to.be.revertedWith("Hash invalid.");
    
    await expect(
      auction.registerAndMintForWhitelist(badNonceHash, badNonceSignature, 1, nonce)
    ).to.be.revertedWith("Hash invalid.");
  });

  it("can mint whitelist", async function () {
    const nonce = 1;
    const hash = getHash(mintWhitelistWithAmountPrefix, owner.address, nonce);
    const ownerSignature = await owner.signMessage(hash);

    await auction.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
        from: owner.address,
        value: BigNumber.from(PRICE),
      });

    expect((await auction.totalSupply()).toString()).to.equal("1");
  });

  it("cannot mint past whitelist limit", async function () {
    const nonce = 4;
    const hash = getHash(mintWhitelistWithAmountPrefix, owner.address, nonce);
    const ownerSignature = await owner.signMessage(hash);

    await auction.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
      from: owner.address,
      value: BigNumber.from(PRICE),
    });

    await auction.registerAndMintForWhitelist(hash, ownerSignature, 2, nonce, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(2),
    });

    await expect(
      auction.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
        from: owner.address,
        value: BigNumber.from(PRICE),
      })
    ).to.be.revertedWith("You cannot mint this many.");
  });

  it("cannot mint past whitelist limit", async function () {
    let nonce = 4;
  
    const hash = getHash(mintWhitelistWithAmountPrefix, owner.address, nonce);
    const ownerSignature = await owner.signMessage(hash);


    await auction.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
      from: owner.address,
      value: BigNumber.from(PRICE),
    });

    await auction.registerAndMintForWhitelist(hash, ownerSignature, 2, nonce, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(2),
    });

    await expect(
      auction.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
        from: owner.address,
        value: BigNumber.from(PRICE),
      })
    ).to.be.revertedWith("You cannot mint this many.");
  });

  it("cannot mint past whitelist limit in the hash", async function () {
    let nonce = 2;

    let hash = getHash(mintWhitelistWithAmountPrefix, owner.address, nonce);
    let ownerSignature = await owner.signMessage(hash);


    await auction.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
      from: owner.address,
      value: BigNumber.from(PRICE),
    });

    await expect(
      auction.registerAndMintForWhitelist(hash, ownerSignature, 2, nonce, {
        from: owner.address,
        value: BigNumber.from(PRICE).mul(2),
      })
    ).to.be.revertedWith("You cannot mint this many.");

    await auction.registerAndMintForWhitelist(hash, ownerSignature, 1, nonce, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(1),
    });
  });

  it("no tokens minted", async function () {
    expect((await auction.totalSupply()).toString()).to.equal("0");
  });

  it("cannot mint while sale is inactive and can mint while sale is active", async function () {
    await expect(auction.connect(other).mintPublic(1)).to.be.revertedWith("You cannot mint this many.");

    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.conect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from(PRICE),
    });

    await auction.setPublicListMaxMint(0);

    await expect(auction.connect(other).mintPublic(1)).to.be.revertedWith("You cannot mint this many.");
  });

  it("tokenURI is just tokenID without a base URI", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from(PRICE),
    });

    expect(await auction.tokenURI(0)).equal(`${0}`);
  });

  it("tokenURI is concatenated with a valid base URI which overrides the base URI", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from(PRICE),
    });

    await expect(auction.connect(other).setBaseURI(BASE_URI)).to.be.revertedWith("Ownable: caller is not the owner");
    await auction.setBaseURI(BASE_URI);

    expect(await auction.tokenURI(0)).equal(`${BASE_URI}${0}`);
  });

  // it("cannot set tokenURI with a bad signature", async function () {
  //   await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  //   const nonce = 0;
  //   const hash = utils.solidityKeccak256(
  //     ["string", "address", "string", "uint256"],
  //     [tokenURIPrefix, owner, "test", nonce]
  //   );

  //   const otherSignature = EthCrypto.sign(otherKey, hash);
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);

  //   await auction.mintPublic(1, {
  //     from: owner.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await expectRevert(
  //     auction.setTokenURI(0, "test", nonce, hash, otherSignature),
  //     "Signature invalid."
  //   );
  // });

  // it("cannot unlock animation with zodiacs with bad hash", async function () {
  //   await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

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

  //   await auction.mintPublic(1, {
  //     from: owner.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await expectRevert(
  //     auction.setTokenURI(0, "test", nonce, badPrefixHash, badPrefixSignature),
  //     "Hash invalid."
  //   );

  //   await expectRevert(
  //     auction.setTokenURI(
  //       0,
  //       "test",
  //       nonce,
  //       badAddressHash,
  //       badAddressSignature
  //     ),
  //     "Hash invalid."
  //   );

  //   await expectRevert(
  //     auction.setTokenURI(
  //       0,
  //       "test",
  //       nonce,
  //       badTokenURIHash,
  //       badTokenURISignature
  //     ),
  //     "Hash invalid."
  //   );

  //   await expectRevert(
  //     auction.setTokenURI(0, "test", nonce, badNonceHash, badNonceSignature),
  //     "Hash invalid."
  //   );
  // });

  // it("can set tokenURI with a correct signature", async function () {
  //   await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  //   let nonce = 0;
  //   let hash = utils.solidityKeccak256(
  //     ["string", "address", "string", "uint256"],
  //     [tokenURIPrefix, owner, "test", nonce]
  //   );

  //   let ownerSignature = EthCrypto.sign(ownerKey, hash);

  //   await auction.mintPublic(1, {
  //     from: owner.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   expect(await auction.tokenURI(0)).equal(`${0}`);

  //   await auction.setBaseURI(BASE_URI, { from: owner });

  //   expect(await auction.tokenURI(0)).equal(`${BASE_URI}${0}`);

  //   await auction.setTokenURI(0, "test", nonce, hash, ownerSignature, {
  //     from: owner.address,
  //   });

  //   expect(await auction.tokenURI(0)).equal(`${"test"}`);

  //   nonce = 1;
  //   hash = utils.solidityKeccak256(
  //     ["string", "address", "string", "uint256"],
  //     [tokenURIPrefix, owner, "", nonce]
  //   );

  //   ownerSignature = EthCrypto.sign(ownerKey, hash);

  //   await auction.setTokenURI(0, "", nonce, hash, ownerSignature, {
  //     from: owner.address,
  //   });

  //   expect(await auction.tokenURI(0)).equal(`${BASE_URI}${0}`);
  // });

  // it("cannot set tokenURI with a reused nonce", async function () {
  //   await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  //   let nonce = 0;
  //   let hash = utils.solidityKeccak256(
  //     ["string", "address", "string", "uint256"],
  //     [tokenURIPrefix, owner, "test", nonce]
  //   );

  //   let ownerSignature = EthCrypto.sign(ownerKey, hash);

  //   await auction.mintPublic(1, {
  //     from: owner.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await auction.setTokenURI(0, "test", nonce, hash, ownerSignature, {
  //     from: owner.address,
  //   });

  //   await expectRevert(
  //     auction.setTokenURI(0, "test", nonce, hash, ownerSignature, {
  //       from: owner.address,
  //     }),
  //     "Nonce already used."
  //   );
  // });

  // it("cannot set tokenURI with a token you do not own", async function () {
  //   await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  //   let nonce = 0;
  //   let hash = utils.solidityKeccak256(
  //     ["string", "address", "string", "uint256"],
  //     [tokenURIPrefix, owner, "test", nonce]
  //   );

  //   let ownerSignature = EthCrypto.sign(ownerKey, hash);

  //   await auction.mintPublic(1, {
  //     from: owner.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await auction.mintPublic(1, {
  //     from: other.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await expectRevert(
  //     auction.setTokenURI(1, "test", nonce, hash, ownerSignature, {
  //       from: owner.address,
  //     }),
  //     "You do not own this token."
  //   );
  // });

  // it("only owner can enable sale state", async function () {
  //   await expectRevert(
  //     auction.setPublicListMaxMint(1, { from: other }),
  //     "Ownable: caller is not the owner"
  //   );
  // });

  // it("only owner can mint reserved nfts and mints up to reserved limit", async function () {
  //   await expectRevert(
  //     auction.mintReserved(TOTAL_RESERVED_SUPPLY, { from: other }),
  //     "Ownable: caller is not the owner"
  //   );

  //   await auction.mintReserved(TOTAL_RESERVED_SUPPLY, { from: owner });

  //   expect((await auction.totalSupply()).toString()).to.equal("2");
  // });

  it("cannot mint more than max count", async function () {
    await auction.setPublicListMaxMint(MAX + 1);

    await auction.mintPublic(4, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(4),
    });

    await auction.mintPublic(4, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(4),
    });

    await expect(
      auction.mintPublic(3, {
        from: owner.address,
        value: BigNumber.from(PRICE).mul(3),
      })).to.be.revertedWith("Sold out.");

    await auction.mintPublic(2, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(2),
    });
  });

  it("cannot purchase tokens with insufficient ether", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await expectRevert(auction.mintPublic(1), "Invalid amount.");
  });

  it("can purchase tokens with sufficient ether", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE),
    });
  });

  it("cannot purchase multiple tokens with insufficient ether", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await expect(
      auction.mintPublic(2, {
        value: BigNumber.from(PRICE),
      })).to.be.revertedWith("Invalid amount.");
  });

  it("can purchase multiple tokens with sufficient ether", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.mintPublic(halfPublicListMax, {
      value: BigNumber.from(PRICE).mul(halfPublicListMax),
    });
  });

  it("cannot mint more than public list max and can increase limit", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
    });

    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
    });

    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
    });

    await expect(
      auction.mintPublic(1, {
        value: BigNumber.from(PRICE).mul(1),
      })).to.be.revertedWith("You cannot mint this many.");

    await expect(auction.connect(other).setPublicListMaxMint(4)).to.be.revertedWith("Ownable: caller is not the owner");

    auction.setPublicListMaxMint(4);

    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
    });
  });

  it("whitelist denies users not on whitelist", async function () {
    const hash = getHash(HASH_PREFIX, owner.address);
    const otherSignature = await other.signMessage(hash);

    await expect(
      auction.connect(other).mintWhitelist(hash, otherSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      })).to.be.revertedWith("This hash's signature is invalid.");

    const ownerSignature = await owner.signMessage(hash);
    await expect(
      auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      })).to.be.revertedWith("The address hash does not match the signed hash.");
  });

  it("cannot replay attack hashes", async function () {
    const hash = getHash(HASH_PREFIX, other.address);
    const ownerSignature = await owner.signMessage(hash);
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await auction.setPrefix("Public Sale Verification:", {
      from: owner.address,
    });

    await expectRevert(
      auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      }),
      "The address hash does not match the signed hash."
    );

    const newHash = getHash("Public Sale Verification:", other.address);
    const newOwnerSignature = await other.signMessage(newHash);
    await auction.connect(other).mintWhitelist(newHash, newOwnerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  });

  it("whitelist allows users on whitelist", async function () {
     const hash = getHash(HASH_PREFIX, other.address);
    const ownerSignature = await owner.signMessage(hash);
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  });

  it("whitelisted users cannot mint past whitelist limit", async function () {
    const hash = getHash(HASH_PREFIX, other.address);
    const ownerSignature = await owner.signMessage(hash);
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await expectRevert(
      auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      }),
      "You cannot mint this many."
    );
  });

  // it("whitelist cap is independent of public cap", async function () {
  //   const hash = soliditySha3(HASH_PREFIX, other);

  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });

  //   await auction.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other.address,
  //   });

  //   await auction.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other.address,
  //   });

  //   await auction.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other.address,
  //   });

  //   await expectRevert(
  //     auction.mintWhitelist(hash, ownerSignature, 1, {
  //       value: BigNumber.from(PRICE),
  //       from: other.address,
  //     }),
  //     "You cannot mint this many."
  //   );

  //   ({ from: owner });

  //   await auction.mintPublic(1, {
  //     from: other.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await auction.mintPublic(1, {
  //     from: other.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await auction.mintPublic(1, {
  //     from: other.address,
  //     value: BigNumber.from(PRICE),
  //   });

  //   await expectRevert(
  //     auction.mintPublic(1, {
  //       from: other.address,
  //       value: BigNumber.from(PRICE),
  //     }),
  //     "You cannot mint this many."
  //   );
  // });

  it("whitelist cap is not independent of public cap", async function () {
    const hash = getHash(HASH_PREFIX, other.address);
    const ownerSignature = await owner.signMessage(hash);
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await expect(
      auction.mintWhitelist(hash, ownerSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      })).to.be.revertedWith("You cannot mint this many.");

    await expect(
      auction.connect(other).mintPublic(1, {
        from: other.address,
        value: BigNumber.from(PRICE),
      })).to.be.revertedWith("You cannot mint this many.");
  });

  it("whitelist max mints can be adjusted", async function () {
    const hash = getHash(HASH_PREFIX, other.address);
    const ownerSignature = await owner.signMessage(hash);
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });

    await expect(
      auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      })).to.be.revertedWith("You cannot mint this many.");

    await expect(auction.connect(other).setWhitelistMaxMint(4)).to.be.revertedWith("Ownable: caller is not the owner");

    auction.setWhitelistMaxMint(4);

    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  });

  it("payment splitter releases nothing in the beginning", async function () {
    await expect(
      auction.release(jon.address)).to.be.revertedWith("PaymentSplitter: account is not due payment.");
    await expect(
      auction.release(ronald.address)).to.be.revertedWith("PaymentSplitter: account is not due payment.");
    await expect(
      auction.release(eric.address)).to.be.revertedWith("PaymentSplitter: account is not due payment.");
  });

  it("payment split correctly releases money after one mint and refuses to pay out duplicate calls", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });

    await auction.splitPayments({ from: owner });
    await expect(() => auction.release(jon.address)).to.changeEtherBalance(jon, parseEther("3.75"));
    await expect(() => auction.release(ronald.address)).to.changeEtherBalance(ronald, parseEther("0.75"));
    await expect(() => auction.release(eric.address)).to.changeEtherBalance(eric, parseEther("0.5"));

    await expect(
      auction.release(jon.address)
      ).to.be.revertedWith("PaymentSplitter: account is not due payment");
    await expect(
      auction.release(ronald.address)
      ).to.be.revertedWith("PaymentSplitter: account is not due payment");
    await expect(
      auction.release(eric.address)
      ).to.be.revertedWith("PaymentSplitter: account is not due payment");
  });

  it("payment splitter will not payout accounts that weren't assigned to it", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.connect(other).mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });

    await expect(
      auction.release(other)).to.be.revertedWith("PaymentSplitter: account has no shares");
  });

  it("payment splitter will pay out again after a second mint", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);

    await auction.connect(other).mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });

    await auction.splitPayments({ from: owner });

    await expect(() => auction.release(jon.address)).to.changeEtherBalance(jon, parseEther("3.75"));
    await expect(() => auction.release(ronald.address)).to.changeEtherBalance(ronald, parseEther("0.75"));
    await expect(() => auction.release(eric.address)).to.changeEtherBalance(eric, parseEther("0.5"));

    await auction.connect(other).mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });

    await auction.splitPayments();

    await expect(() => auction.release(jon.address)).to.changeEtherBalance(jon, parseEther("3.75"));
    await expect(() => auction.release(ronald.address)).to.changeEtherBalance(ronald, parseEther("0.75"));
    await expect(() => auction.release(eric.address)).to.changeEtherBalance(eric, parseEther("0.5"));
  });

  it("payment splitter will pay out everything after multiple mints", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });
  
    await auction.connect(other).mintPublic(2, {
      value: BigNumber.from(PRICE).mul(2),
      from: other.address,
    });
  
    await auction.splitPayments();
    await expect(() => auction.release(jon.address)).to.changeEtherBalance(jon, parseEther("11.25"));
    await expect(() => auction.release(ronald.address)).to.changeEtherBalance(ronald, parseEther("2.25"));
    await expect(() => auction.release(eric.address)).to.changeEtherBalance(eric, parseEther("1.5"))
  });
});