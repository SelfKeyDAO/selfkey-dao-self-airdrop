const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mumbai addresses
    const proxyAddress = "0x62880bc85712eE70609BC7e11Bf452475D4e1566";

    const contractFactory = await hre.ethers.getContractFactory("SelfkeyDaoVoting");
    const contract = await upgrades.upgradeProxy(proxyAddress, contractFactory);
    await contract.deployed();

    console.log("Upgraded contract address:", contract.address);

    // INFO: verify contract after deployment
    // npx hardhat verify --network mumbai 0xA0c61F041DD1059fCE6a50D2461De63a0D47017C
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
