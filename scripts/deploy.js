const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mumbai addresses
    const authContractAddress = "0x1e4BBcF6c10182C03c66bDA5BE6E04509bE1160F";
    const mintableRegistryContractAddress = "0xfAA8d6Ce9A457567bF81c00496DfC07959025bA4";
    const authorizedSignerAddress = "0x89145000ADBeCe9D1FFB26F645dcb0883bc5c3d9";

    const contractFactory = await hre.ethers.getContractFactory("SelfkeyDaoSelfAirdrop");
    const contract = await upgrades.deployProxy(contractFactory, [authContractAddress, authorizedSignerAddress, mintableRegistryContractAddress], { timeout: 500000 });
    await contract.deployed();

    console.log("Deployed contract address:", contract.address);

    //const signer = "0x89145000ADBeCe9D1FFB26F645dcb0883bc5c3d9";
    //console.log("Controller wallet address:", signer);
    //await contract.changeAuthorizedSigner(signer);

    // INFO: verify contract after deployment
    // npx hardhat verify --network mumbai 0x62880bc85712eE70609BC7e11Bf452475D4e1566
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
