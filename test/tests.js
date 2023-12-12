const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");


describe("Selfkey.DAO simple airdrop tests", function () {
    let authContract;
    let contract;

    let owner;
    let addr1;
    let addr2;
    let receiver;
    let signer;
    let addrs;

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async function () {
        [owner, addr1, addr2, receiver, signer, ...addrs] = await ethers.getSigners();

        let authorizationContractFactory = await ethers.getContractFactory("SelfkeyIdAuthorization");
        authContract = await authorizationContractFactory.deploy(signer.address);

        let airdropContractFactory = await ethers.getContractFactory("SelfkeyDaoSelfAirdrop");
        contract = await upgrades.deployProxy(airdropContractFactory, [authContract.address]);
        await contract.deployed();
    });

    describe("Deployment", function() {
        it("Deployed correctly and Selfkey.ID authorization contract was set", async function() {
            expect(await contract.authorizationContract()).to.equal(authContract.address);
        });
    });

    describe("Proposals", function() {
        it("Owner can create Airdrop proposals", async function() {
            await expect(contract.connect(owner).createAirdropProposal("Airdrop A", 1, true, { from: owner.address }))
                .to.emit(contract, 'AirdropProposalCreated')
                .withArgs(1, "Airdrop A", 1, true);

            const proposal = await contract.proposals(1);
            expect(proposal.title).to.equal("Airdrop A");

            const numProposals = await contract.numProposals();
            expect(numProposals).to.equal(1);
        });

        it("Non-Owner cannot create Airdrop proposals", async function() {
            await expect(contract.connect(addr1).createAirdropProposal("Voting A", 1, true, { from: addr1.address }))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Airdrop", function() {
        it("Should not allow a non-authorized user to cast a vote", async () => {
            await expect(contract.connect(owner).createProposal("Voting A", true, { from: owner.address }))
                .to.emit(contract, 'ProposalCreated')
                .withArgs(1, "Voting A", true);

            const proposal = await contract.proposals(1);
            expect(proposal.title).to.equal("Voting A");

            let _from = contract.address;
            let _to = addr1.address;
            let _amount = 1;
            let _scope = 'gov:proposal:vote2';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Verification failed");
        });

        it("Should allow a authorized user to cast a vote", async () => {
            await expect(contract.connect(owner).createProposal("Voting A", true, { from: owner.address }))
                .to.emit(contract, 'ProposalCreated')
                .withArgs(1, "Voting A", true);

            const proposal = await contract.proposals(1);
            expect(proposal.title).to.equal("Voting A");

            let _from = contract.address;
            let _to = addr1.address;
            let _amount = 1;
            let _scope = 'gov:proposal:vote';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'VoteCast')
                .withArgs(1, addr1.address, _amount);


            const voteCount = await contract.getVoteCount(1);
            const hasVoted = await contract.hasUserVoted(1, addr1.address);

            expect(voteCount.toNumber()).to.equal(1);
            expect(hasVoted).to.be.true;
          });

          it("Should allow a authorized user to cast more than one vote", async () => {
            await expect(contract.connect(owner).createProposal("Voting A", true, { from: owner.address }))
                .to.emit(contract, 'ProposalCreated')
                .withArgs(1, "Voting A", true);

            const proposal = await contract.proposals(1);
            expect(proposal.title).to.equal("Voting A");

            let _from = contract.address;
            let _to = addr1.address;
            let _amount = 2;
            let _scope = 'gov:proposal:vote';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'VoteCast')
                .withArgs(1, addr1.address, _amount);


            const voteCount = await contract.getVoteCount(1);
            const hasVoted = await contract.hasUserVoted(1, addr1.address);

            // const p = await contract.proposals(1);
            // console.log(p);

            expect(voteCount.toNumber()).to.equal(2);
            expect(hasVoted).to.be.true;
          });

          it("Should not allow a authorized user to vote more than once", async () => {
            await expect(contract.connect(owner).createProposal("Voting A", true, { from: owner.address }))
                .to.emit(contract, 'ProposalCreated')
                .withArgs(1, "Voting A", true);

            const proposal = await contract.proposals(1);
            expect(proposal.title).to.equal("Voting A");

            let _from = contract.address;
            let _to = addr1.address;
            let _amount = 2;
            let _scope = 'gov:proposal:vote';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.emit(contract, 'VoteCast')
                .withArgs(1, addr1.address, _amount);


            const voteCount = await contract.getVoteCount(1);
            const hasVoted = await contract.hasUserVoted(1, addr1.address);

            expect(voteCount.toNumber()).to.equal(2);
            expect(hasVoted).to.be.true;

            await expect(contract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Already voted for this proposal");
          });


          it("Cannot vote for an inactive proposal", async () => {
            await expect(contract.connect(owner).createProposal("Voting A", false, { from: owner.address }))
                .to.emit(contract, 'ProposalCreated')
                .withArgs(1, "Voting A", false);

            const proposal = await contract.proposals(1);
            expect(proposal.title).to.equal("Voting A");

            let _from = contract.address;
            let _to = addr1.address;
            let _amount = 2;
            let _scope = 'gov:proposal:vote';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Proposal is not active");

          });

          it("Cannot vote for an inexistent proposal", async () => {

            let _from = contract.address;
            let _to = addr1.address;
            let _amount = 2;
            let _scope = 'gov:proposal:vote';
            let _timestamp = await time.latest();
            let _param = ethers.utils.hexZeroPad(1, 32);

            // Lock 10 KEY for addr1
            let hash = await authContract.getMessageHash(_from, _to, _amount, _scope, _param, _timestamp);
            let signature = await signer.signMessage(ethers.utils.arrayify(hash));
            expect(await authContract.verify(_from, _to, _amount, _scope, _param, _timestamp, signer.address, signature)).to.equal(true);

            await expect(contract.connect(addr1).vote(addr1.address, _amount, _param, _timestamp, signer.address, signature, { from: addr1.address }))
                .to.be.revertedWith("Proposal does not exist");

          });
    });
});
