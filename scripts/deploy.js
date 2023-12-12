const { ethers, upgrades } = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Mumbai addresses
    const authContractAddress = "0x1e4BBcF6c10182C03c66bDA5BE6E04509bE1160F";

    const contractFactory = await hre.ethers.getContractFactory("SelfkeyDaoVoting");
    const contract = await upgrades.deployProxy(contractFactory, [authContractAddress]);
    await contract.deployed();

    console.log("Deployed contract address:", contract.address);

    //const signer = "0x89145000ADBeCe9D1FFB26F645dcb0883bc5c3d9";
    //console.log("Controller wallet address:", signer);
    //await contract.changeAuthorizedSigner(signer);

    await contract.createProposal('Mint Self', true);

    // INFO: verify contract after deployment
    // npx hardhat verify --network mumbai 0xA0c61F041DD1059fCE6a50D2461De63a0D47017C
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
