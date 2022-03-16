const { expect, assert } = require("chai");
const { ethers, upgrades  } = require("hardhat");
const parseEther = ethers.utils.parseEther;
const { BigNumber } = require("ethers");

function getHash(address, data) {
  let messageHash = ethers.utils.solidityKeccak256(
      ["string", "address"],
      [data, address]
  );
  let messageHashBinary = ethers.utils.arrayify(messageHash);
  return messageHashBinary
}

function getParamFromEvent(transaction, interface, eventName, paramIndex) {
  const logs = transaction.logs.filter((l) =>
    l.topics.includes(ethers.utils.id(eventName))
  );
  assert.equal(logs.length, 1, "Too many logs found!");

  const event = interface.parseLog(logs[0]);

  return event.args[paramIndex];
};


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
  
  const BaseDutchAuctionCreatorJson = require("../artifacts/contracts/BaseDutchAuctionERC721ACreator.sol/BaseDutchAuctionERC721ACreator.json");
  let iface;
  let index = 0;
  before(async() => {
    accounts = await ethers.getSigners();
    [owner, other, other2, jon, ronald, eric] = accounts;
    auctionFactory = await ethers.getContractFactory("BaseDutchAuctionERC721AUpgradeable");
    auctionBeacon = await upgrades.deployBeacon(auctionFactory);
   
    auctionCreatorFactory = await ethers.getContractFactory("BaseDutchAuctionERC721ACreator");
    auctionCreator = await upgrades.deployProxy(auctionCreatorFactory, [auctionBeacon.address], {kind : "uups"});
    await auctionCreator.deployed();
    
    iface = new ethers.utils.Interface(BaseDutchAuctionCreatorJson.abi);
 })

  beforeEach(async function () {
    
    const transaction = await auctionCreator.createAuction(
      [jon.address, ronald.address, eric.address],
      [75, 15, 10],
      "BaseDutchAuctionTest",
      "BDAT",
      ALLOW_LIST_MAX_MINT,
      0,
      TOTAL_SALE_SUPPLY,
      TOTAL_RESERVED_SUPPLY,
      PRICE_DISCOUNTED,
    )
    
    // const auctionAddress = getParamFromEvent(
    //   await transaction.wait(),
    //   iface,
    //   "CreateAuction(uint256 indexed,address,string,string)",
    //   1
    // );
    const auctionAddress = await auctionCreator.getAuction(++index)
    auction = await auctionFactory.attach(auctionAddress);
  })

  it('should only let admin upgrade the auction creator', async () => {
    let v2 = await ethers.getContractFactory("BaseDutchAuctionERC721ACreator2", other);
    await expect(upgrades.upgradeProxy(auctionCreator.address, v2)).to.be.reverted;
    
    v2 = await ethers.getContractFactory("BaseDutchAuctionERC721ACreator2", owner);
    const upgrade = await upgrades.upgradeProxy(auctionCreator.address, v2);
    await expect(await upgrade.updatedFunction()).to.eq("v2");
  })
  
  it('should only let admin upgrade the auction', async () => {
    const v2Factory = await ethers.getContractFactory("BaseDutchAuctionERC721AUpgradeable2");
    const v2 = await v2Factory.deploy();
    await v2.deployed();

    await expect(auctionBeacon.connect(other).upgradeTo(v2.address)).to.be.reverted;

    await auctionBeacon.upgradeTo(v2.address);
    auction = await v2Factory.attach(auction.address);
    await expect(await auction.updatedFunction()).to.eq("v2");

  })
  
  it("only owner can mint reserved nfts and mints up to reserved limit", async function () {
    await expect( auction.connect(other).mintReserved(TOTAL_RESERVED_SUPPLY)).to.be.revertedWith("Ownable: caller is not the owner");
  
    await auction.mintReserved(TOTAL_RESERVED_SUPPLY);
  
    expect((await auction.totalSupply()).toString()).to.equal("2");
  });
  
  it("no tokens minted", async function () {
    expect((await auction.totalSupply()).toString()).to.equal("0");
  });
  
  it("cannot mint while sale is inactive and can mint while sale is active", async function () {
    await expect( auction.connect(other).mintPublic(1)).to.be.revertedWith("You cannot mint this many.");
  
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from(PRICE),
    });
  
    await auction.setPublicListMaxMint(0);
    
    await expect( auction.connect(other).mintPublic(1)).to.be.revertedWith("You cannot mint this many.");
  });
  
  it("tokenURI is just tokenID without a base URI", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from(PRICE),
    });
  
    expect(await auction.tokenURI(TOTAL_RESERVED_SUPPLY + 1)).equal(
      `${TOTAL_RESERVED_SUPPLY + 1}`
    );
  });
  
  it("tokenURI is concatenated with a valid base URI which overrides the base URI", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from(PRICE),
    });
  
    await expect( auction.connect(other).setBaseURI(BASE_URI)).to.be.revertedWith("Ownable: caller is not the owner");
  
    await auction.setBaseURI(BASE_URI);
  
    expect(await auction.tokenURI(TOTAL_RESERVED_SUPPLY + 1)).equal(
      `${BASE_URI}${TOTAL_RESERVED_SUPPLY + 1}`
    );
  });
  
  it("only owner can enable sale state", async function () {
    await expect( auction.connect(other).setAuctionStartPoint(secondsSinceEpoch)).to.be.revertedWith("Ownable: caller is not the owner");
  });
  
  it("cannot mint more than max count", async function () {
    await auction.setAuctionStartPoint(secondsSinceEpoch);
    await auction.setPublicListMaxMint(MAX + 1);
  
    await auction.mintPublic(halfMax, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(halfMax),
    });

    await expect( auction.mintPublic(halfMax + 1, 
      {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(halfMax + 1),
      }
    )).to.be.revertedWith("Sold out.");
    
    await auction.mintPublic(halfMax, {
      from: owner.address,
      value: BigNumber.from(PRICE).mul(halfMax),
    });
  });
  
  it("cannot purchase tokens with insufficient ether", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await expect(auction.mintPublic(1)).to.be.revertedWith("Invalid amount.");
  });
  
  it("can purchase tokens with sufficient ether", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE),
    });
  });
  
  it("cannot purchase multiple tokens with insufficient ether", async function () {
    ({ from: owner });
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
    await expect(
      auction.mintPublic(2, {
        value: BigNumber.from(PRICE),
      })
    ).to.be.revertedWith("Invalid amount.");
  });
  
  it("can purchase multiple tokens with sufficient ether", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.mintPublic(halfPublicListMax, {
      value: BigNumber.from(PRICE).mul(halfPublicListMax),
    });
  });
  
  it("cannot mint more than public list max and can increase limit", async function () {
    ({ from: owner });
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
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
      })
    ).to.be.revertedWith("You cannot mint this many.");
  
    await expect(
      auction.connect(other).setPublicListMaxMint(4)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  
    auction.setPublicListMaxMint(4);
  
    await auction.mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
    });
  });
  
  it("whitelist denies users not on whitelist", async function () {
    let hash = getHash(other2.address, HASH_PREFIX);
    let otherSignature = await other2.signMessage(hash);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await expect(
      auction.connect(other).mintWhitelist(hash, otherSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      })
    ).to.be.revertedWith("Invalid signature");
      
    hash = getHash(owner.address, HASH_PREFIX);
    let signature = await owner.signMessage(hash);
    
    await expect(
      auction.connect(other).mintWhitelist(hash, signature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      })
    ).to.be.revertedWith("Invalid signer");
  });
  
  it("cannot replay attack hashes", async function () {
    let hash = getHash(other.address, HASH_PREFIX);
    let ownerSignature = await owner.signMessage(hash);
 
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  
    await auction.setPrefix("Public Sale Verification:");
  
    await expect(
      auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
        value: BigNumber.from(PRICE),
        from: other.address,
      })
    ).to.be.revertedWith("Invalid signer");
  
    let newHash = getHash(other.address, "Public Sale Verification:");
    let newOwnerSignature = await owner.signMessage(newHash);
  
    await auction.connect(other).mintWhitelist(newHash, newOwnerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  });
  
  it("whitelist allows users on whitelist", async function () {
    let hash = getHash(other.address, HASH_PREFIX);
    let ownerSignature = await owner.signMessage(hash);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  });
  
  it("whitelisted users cannot mint past whitelist limit", async function () {
    let hash = getHash(other.address, HASH_PREFIX);
    let ownerSignature = await owner.signMessage(hash);
    
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
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
      })
    ).to.be.revertedWith("You cannot mint this many.");
  });
  
  // it("whitelist cap is independent of public cap", async function () {
  //   const hash = soliditySha3(HASH_PREFIX, other);
  
  //   const ownerSignature = EthCrypto.sign(ownerKey, hash);
  //   await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT, { from: owner });
  //   await auction.setAuctionStartPoint(secondsSinceEpoch, { from: owner });
  
  //   await auction.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await auction.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await auction.mintWhitelist(hash, ownerSignature, 1, {
  //     value: BigNumber.from(PRICE),
  //     from: other,
  //   });
  
  //   await expectRevert(
  //     auction.mintWhitelist(hash, ownerSignature, 1, {
  //       value: BigNumber.from(PRICE),
  //       from: other,
  //     }),
  //     "You cannot mint this many."
  //   );
  
  //   ({ from: owner });
  
  //   await auction.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from(PRICE),
  //   });
  
  //   await auction.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from(PRICE),
  //   });
  
  //   await auction.mintPublic(1, {
  //     from: other,
  //     value: BigNumber.from(PRICE),
  //   });
  
  //   await expectRevert(
  //     auction.mintPublic(1, {
  //       from: other,
  //       value: BigNumber.from(PRICE),
  //     }),
  //     "You cannot mint this many."
  //   );
  // });
  
  it("whitelist cap contributes to public cap", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    // const hash = soliditySha3(HASH_PREFIX_DISCOUNTED, other);
  
    // // const ownerSignature = EthCrypto.sign(ownerKey, hash);
    // const ownerSignature = await owner.signMessage(hash);
    let hash = getHash(other.address, HASH_PREFIX_DISCOUNTED);
    let ownerSignature = await owner.signMessage(hash);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintWhitelistDiscounted(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE_DISCOUNTED),
      from: other.address,
    });
  
    await auction.connect(other).mintWhitelistDiscounted(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE_DISCOUNTED),
      from: other.address,
    });
  
    await auction.connect(other).mintWhitelistDiscounted(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE_DISCOUNTED),
      from: other.address,
    });
  
    await expect(
      auction.connect(other).mintPublic(1, {
        from: other.address,
        value: BigNumber.from(PRICE),
      })
    ).to.be.revertedWith("You cannot mint this many.");
  });
  
  it("whitelist max mints can be adjusted", async function () {
    let hash = getHash(other.address, HASH_PREFIX);
    let ownerSignature = await owner.signMessage(hash);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
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
      })
    ).to.be.revertedWith("You cannot mint this many.");
  
    await expect(
      auction.connect(other).setWhitelistMaxMint(4)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  
    auction.setWhitelistMaxMint(4);
  
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  });
  
  it("whitelist discounted mint allows whitelisted users with proper price", async function () {
    let hash = getHash(other.address, HASH_PREFIX_DISCOUNTED);
    let ownerSignature = await owner.signMessage(hash);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintWhitelistDiscounted(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE_DISCOUNTED),
      from: other.address,
    });
  });
  
  it("whitelist discounted mint allows whitelisted users with improper price", async function () {
    let hash = getHash(other.address, HASH_PREFIX_DISCOUNTED);
    let ownerSignature = await owner.signMessage(hash);
    let wrongHash = getHash(other.address, HASH_PREFIX);
    let wrongOwnerSignature = await owner.signMessage(wrongHash);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintWhitelistDiscounted(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE_DISCOUNTED),
      from: other.address,
    });
  
    await expect(
      auction.connect(other).mintWhitelistDiscounted(hash, ownerSignature, 1, {
        value: BigNumber.from("1"),
        from: other.address,
      })
    ).to.be.revertedWith("Invalid amount.");
  
    await expect(
      auction.connect(other).mintWhitelistDiscounted(wrongHash, wrongOwnerSignature, 1, {
        value: BigNumber.from(PRICE_DISCOUNTED),
        from: other.address,
      })
    ).to.be.revertedWith("Invalid signer");
  });
  
  it("payment splitter releases nothing in the beginning", async function () {
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
  
  it("payment split correctly releases money after one mint and refuses to pay out duplicate calls", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);

    await auction.connect(other).mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });
  
    await auction.splitPayments();
  
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
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });
  
    await expect(
      auction.release(other.address)
    ).to.be.revertedWith("PaymentSplitter: account has no shares");
  });
  
  it("payment splitter will pay out again after a second mint", async function () {
    await auction.setPublicListMaxMint(PUBLIC_LIST_MAX_MINT);
    await auction.setAuctionStartPoint(secondsSinceEpoch);
  
    await auction.connect(other).mintPublic(1, {
      value: BigNumber.from(PRICE).mul(1),
      from: other.address,
    });
  
    await auction.splitPayments();
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
    await expect(() => auction.release(eric.address)).to.changeEtherBalance(eric, parseEther("1.5"));    
  });
  
  it("dutch auction properly decreases price", async function () {
    await auction.setAuctionStartPoint(secondsSinceEpoch);
    await auction.setPublicListMaxMint(MAX + 1);
  
    await expect(
      auction.connect(other).mintPublic(1, {
        from: other.address,
        value: BigNumber.from("4500000000000000000"),
      })
    ).to.be.revertedWith("Invalid amount.");
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL]);
    await ethers.provider.send('evm_mine');
  
    await expect(
      auction.connect(other).mintPublic(1, {
        from: other.address,
        value: BigNumber.from("4000000000000000000"),
      })
    ).to.be.revertedWith("Invalid amount.");
      
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');

    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL]);
    await ethers.provider.send('evm_mine');
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from("3500000000000000000"),
    });
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from("3000000000000000000"),
    });
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from("2500000000000000000"),
    });
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from("2000000000000000000"),
    });
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from("1500000000000000000"),
    });
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from("1000000000000000000"),
    });
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');
  
    await auction.connect(other).mintPublic(1, {
      from: other.address,
      value: BigNumber.from("500000000000000000"),
    });
  
    await ethers.provider.send('evm_increaseTime', [DECREASE_INTERVAL * 2]);
    await ethers.provider.send('evm_mine');
  
    let hash = getHash(other.address, HASH_PREFIX);
    let ownerSignature = await owner.signMessage(hash);
    await auction.connect(other).mintWhitelist(hash, ownerSignature, 1, {
      value: BigNumber.from(PRICE),
      from: other.address,
    });
  });
}); 

