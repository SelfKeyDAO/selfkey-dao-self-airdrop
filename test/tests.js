const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Selfkey.DAO simple airdrop tests", function () {
  let authContract;
  let mintableRegistryContract;
  let contract;

  let owner;
  let addr1;
  let addr2;
  let receiver;
  let signer;
  let addrs;

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    [owner, addr1, addr2, receiver, signer, ...addrs] =
      await ethers.getSigners();

    let authorizationContractFactory = await ethers.getContractFactory("SelfkeyIdAuthorization");
    authContract = await authorizationContractFactory.deploy(signer.address);

    let mintableRegistryContractFactory = await ethers.getContractFactory("SelfkeyMintableRegistry");
    mintableRegistryContract = await upgrades.deployProxy(mintableRegistryContractFactory, []);

    let airdropContractFactory = await ethers.getContractFactory("SelfkeyDaoSelfAirdrop");
    contract = await upgrades.deployProxy(airdropContractFactory, [authContract.address, signer.address, mintableRegistryContract.address]);
    await contract.deployed();

    await mintableRegistryContract.connect(owner).addAuthorizedCaller(contract.address);
  });

  describe("Deployment", function () {
    it("Selfkey.ID authorization contract is set", async function () {
      expect(await contract.authorizationContract()).to.equal(
        authContract.address
      );
    });
    it("Authorized signer is set", async function () {
      expect(await contract.authorizedSigner()).to.equal(signer.address);
    });
  });

  describe("Proposals", function () {
    it("Owner can create Airdrop proposals", async function () {
      await expect(
        contract
          .connect(owner)
          .createAirdropProposal("Airdrop A", 1, true, { from: owner.address })
      )
        .to.emit(contract, "AirdropProposalCreated")
        .withArgs(1, "Airdrop A", 1, true);

      const proposal = await contract.proposals(1);
      expect(proposal.title).to.equal("Airdrop A");

      const numProposals = await contract.numProposals();
      expect(numProposals).to.equal(1);
    });

    it("Non-Owner cannot create Airdrop proposals", async function () {
      await expect(
        contract
          .connect(addr1)
          .createAirdropProposal("Airdrop A", 1, true, { from: addr1.address })
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Airdrop", function () {

    it("Should allow a authorized user to claim a Airdrop", async () => {
        const _amount = 10000;
        await expect(contract.connect(owner).createAirdropProposal("Airdrop A", _amount, true, { from: owner.address }))
        .to.emit(contract, "AirdropProposalCreated")
        .withArgs(1, "Airdrop A", _amount, true);

        const proposal = await contract.proposals(1);
        expect(proposal.title).to.equal("Airdrop A");

        let _from = contract.address;
        let _to = addr1.address;
        let _scope = "selfkey.self.airdrop";
        let _timestamp = await time.latest();
        let _param = ethers.utils.hexZeroPad(1, 32);

        let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
        let signature = await signer.signMessage(ethers.utils.arrayify(hash));
        expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

        await expect(contract.connect(addr1).selfAirdrop(addr1.address, _param, _timestamp, signer.address, signature, { from: addr1.address }))
        .to.emit(contract, "Airdrop")
        .withArgs(1, addr1.address, _amount);

        const airdropCount = await contract.getAirdropCount(1);
        const hasAirdrop = await contract.hasReceivedAirdrop(1, addr1.address);

        expect(airdropCount.toNumber()).to.equal(1);
        expect(hasAirdrop).to.be.true;

        const earned = await mintableRegistryContract.balanceOf(addr1.address);
        expect(earned.toNumber()).to.equal(_amount);
    });

    it("Should not allow a non-authorized signer to emit an airdrop", async () => {
      await expect(contract.connect(owner).createAirdropProposal("Airdrop A", 1, true, { from: owner.address }))
        .to.emit(contract, "AirdropProposalCreated")
        .withArgs(1, "Airdrop A", 1, true);

      const proposal = await contract.proposals(1);
      expect(proposal.title).to.equal("Airdrop A");

      let _from = contract.address;
      let _to = addr2.address;
      let _amount = 1;
      let _scope = "selfkey.self.airdrop";
      let _timestamp = await time.latest();
      let _param = ethers.utils.hexZeroPad(1, 32);

      let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
      let signature = await signer.signMessage(ethers.utils.arrayify(hash));
      expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

      await expect(contract.connect(addr1).selfAirdrop(addr1.address, _param, _timestamp, signer.address, signature, { from: addr1.address }))
        .to.be.revertedWith("Verification failed");
    });

    it("Should not allow a authorized user to emit more than one Airdrop", async () => {
        await expect(contract.connect(owner).createAirdropProposal("Airdrop A", 1, true, { from: owner.address }))
        .to.emit(contract, "AirdropProposalCreated")
        .withArgs(1, "Airdrop A", 1, true);

        const proposal = await contract.proposals(1);
        expect(proposal.title).to.equal("Airdrop A");

        let _from = contract.address;
        let _to = addr1.address;
        let _amount = 1;
        let _scope = "selfkey.self.airdrop";
        let _timestamp = await time.latest();
        let _param = ethers.utils.hexZeroPad(1, 32);

        let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
        let signature = await signer.signMessage(ethers.utils.arrayify(hash));
        expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

        await expect(contract.connect(addr1).selfAirdrop(addr1.address, _param, _timestamp, signer.address, signature, { from: addr1.address }))
            .to.emit(contract, "Airdrop")
            .withArgs(1, addr1.address, _amount);

        const airdropCount = await contract.getAirdropCount(1);
        const hasAirdrop = await contract.hasReceivedAirdrop(1, addr1.address);

        expect(airdropCount.toNumber()).to.equal(1);
        expect(hasAirdrop).to.be.true;

        _timestamp = await time.latest();
        hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
        signature = await signer.signMessage(ethers.utils.arrayify(hash));
        expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);
        await expect(contract.connect(addr1).selfAirdrop(addr1.address, _param, _timestamp, signer.address, signature, { from: addr1.address }))
            .to.be.revertedWith("Already received airdrop");
    });

    it("Should allow controller wallet to emit airdrop for a user", async () => {
        const _amount = 2;
        const _proposalId = 1;
        await expect(contract.connect(owner).createAirdropProposal("Airdrop A", _amount, true, { from: owner.address }))
            .to.emit(contract, "AirdropProposalCreated")
            .withArgs(1, "Airdrop A", _amount, true);

        const proposal = await contract.proposals(1);
        expect(proposal.title).to.equal("Airdrop A");

        await expect(contract.connect(signer).airdrop(addr1.address, _proposalId, _amount, { from: signer.address }))
            .to.emit(contract, "Airdrop")
            .withArgs(1, addr1.address, _amount);

        const airdropCount = await contract.getAirdropCount(_proposalId);
        const hasAirdrop = await contract.hasReceivedAirdrop(_proposalId, addr1.address);

        expect(airdropCount.toNumber()).to.equal(1);
        expect(hasAirdrop).to.be.true;
    });

    it("Should not allow controller wallet to emit more than one airdrop for a user", async () => {
        const _amount = 2;
        const _proposalId = 1;
        await expect(contract.connect(owner).createAirdropProposal("Airdrop A", _amount, true, { from: owner.address }))
            .to.emit(contract, "AirdropProposalCreated")
            .withArgs(1, "Airdrop A", _amount, true);

        const proposal = await contract.proposals(1);
        expect(proposal.title).to.equal("Airdrop A");

        await expect(contract.connect(signer).airdrop(addr1.address, _proposalId, _amount, { from: signer.address }))
            .to.emit(contract, "Airdrop")
            .withArgs(1, addr1.address, _amount);

        const airdropCount = await contract.getAirdropCount(_proposalId);
        const hasAirdrop = await contract.hasReceivedAirdrop(_proposalId, addr1.address);

        expect(airdropCount.toNumber()).to.equal(1);
        expect(hasAirdrop).to.be.true;

        await expect(contract.connect(signer).airdrop(addr1.address, _proposalId, _amount, { from: signer.address }))
            .to.be.revertedWith("Already received airdrop");
    });

    it("Should not allow controller wallet to emit airdrop with different amount", async () => {
        const _amount = 2;
        const _proposalId = 1;
        await expect(contract.connect(owner).createAirdropProposal("Airdrop A", 1, true, { from: owner.address }))
            .to.emit(contract, "AirdropProposalCreated")
            .withArgs(1, "Airdrop A", 1, true);

        const proposal = await contract.proposals(1);
        expect(proposal.title).to.equal("Airdrop A");

        await expect(contract.connect(signer).airdrop(addr1.address, _proposalId, _amount, { from: signer.address }))
            .to.be.revertedWith("Amount does not match");
    });

    it("Should not allow controller wallet to emit airdrop for inactive proposals", async () => {
        const _amount = 2;
        const _proposalId = 1;
        await expect(contract.connect(owner).createAirdropProposal("Airdrop A", _amount, false, { from: owner.address }))
            .to.emit(contract, "AirdropProposalCreated")
            .withArgs(1, "Airdrop A", _amount, false);

        const proposal = await contract.proposals(1);
        expect(proposal.title).to.equal("Airdrop A");

        await expect(contract.connect(signer).airdrop(addr1.address, _proposalId, _amount, { from: signer.address }))
            .to.be.revertedWith("Proposal is not active");
    });

    it("Should not allow controller wallet to emit airdrop for non-existent proposals", async () => {
        const _amount = 2;
        const _proposalId = 1;

        await expect(contract.connect(signer).airdrop(addr1.address, _proposalId, _amount, { from: signer.address }))
            .to.be.revertedWith("Proposal does not exist");
    });

    it("Should not allow non-controller wallet to emit airdrop for a user", async () => {
        const _amount = 2;
        const _proposalId = 1;
        await expect(contract.connect(owner).createAirdropProposal("Airdrop A", _amount, true, { from: owner.address }))
            .to.emit(contract, "AirdropProposalCreated")
            .withArgs(1, "Airdrop A", _amount, true);

        const proposal = await contract.proposals(1);
        expect(proposal.title).to.equal("Airdrop A");

        await expect(contract.connect(addr2).airdrop(addr1.address, _proposalId, _amount, { from: addr2.address }))
            .to.be.revertedWith("Not authorized to register");
    });
  });
});
