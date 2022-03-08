const EthCrypto = require("eth-crypto");

async function main() {
  address = "0x20Fc0500C692921f841452AFfE3cce812e7a0596";

  const Contract = await ethers.getContractFactory("BaseDutchAuction");
  const contract = await Contract.attach(address);

  await contract.mintPublic(1, {
    value: ethers.utils.parseEther("0.0005"),
    gasLimit: 150000,
    gasPrice: 1,
  });

  // console.log(
  //   (
  //     await contract.mintPublic(1, { value: ethers.utils.parseEther("0.005") })
  //   ).toString()
  // );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
