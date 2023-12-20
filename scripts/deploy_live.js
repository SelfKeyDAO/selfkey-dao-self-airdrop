const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Polygon addresses
    const authContractAddress = "0x9928D9e849317983760a61FC486696001f387C6E";
    const mintableRegistryContractAddress = "0x64450DA938d06bE7EEc68E4Ead99FfF05D8Cebe7";
    const authorizedSignerAddress = "0x89145000ADBeCe9D1FFB26F645dcb0883bc5c3d9";

    const contractFactory = await hre.ethers.getContractFactory("SelfkeyDaoSelfAirdrop");
    const contract = await upgrades.deployProxy(contractFactory, [authContractAddress, authorizedSignerAddress, mintableRegistryContractAddress], { timeout: 500000 });
    await contract.deployed();

    console.log("Deployed contract address:", contract.address);

    // INFO: verify contract after deployment
    // npx hardhat verify --network polygon 0xc5cC94C123780482FCD8dC18F06028Ae4de224c6
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
