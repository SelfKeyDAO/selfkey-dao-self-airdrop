// SPDX-License-Identifier: proprietary
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./external/ISelfkeyIdAuthorization.sol";
import "./external/ISelfkeyMintableRegistry.sol";
import "./ISelfkeyDaoSelfAirdrop.sol";

contract SelfkeyDaoSelfAirdrop is Initializable, OwnableUpgradeable, ISelfkeyDaoSelfAirdrop {

    address public authorizedSigner;
    ISelfkeyIdAuthorization public authorizationContract;

    ISelfkeyMintableRegistry public mintableRegistryContract;

    // Mapping to store proposals by ID
    mapping(uint256 => AirdropProposal) public proposals;
    // Variable to store the number of proposals
    uint256 public numProposals;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _authorizationContract, address _authorizedSigner, address _mintableRegistryContract) public initializer {
        __Ownable_init();
        authorizationContract = ISelfkeyIdAuthorization(_authorizationContract);
        mintableRegistryContract = ISelfkeyMintableRegistry(_mintableRegistryContract);
        authorizedSigner = _authorizedSigner;
    }

    function setAuthorizationContractAddress(address _newAuthorizationContractAddress) public onlyOwner {
        authorizationContract = ISelfkeyIdAuthorization(_newAuthorizationContractAddress);
        emit AuthorizationContractAddressChanged(_newAuthorizationContractAddress);
    }

    function changeAuthorizedSigner(address _signer) public onlyOwner {
        require(_signer != address(0), "Invalid authorized signer");
        authorizedSigner = _signer;
        emit AuthorizedSignerChanged(_signer);
    }

    // Function to create a new proposal
    function createAirdropProposal(string memory _title, uint _amount, bool _active) external onlyOwner {
        numProposals++;
        proposals[numProposals].title = _title;
        proposals[numProposals].amount = _amount;
        proposals[numProposals].active = _active;

        emit AirdropProposalCreated(numProposals, _title, _amount, _active);
    }

    function updateAirdropProposal(uint256 _proposalId, string memory _title, uint _amount, bool _active) external onlyOwner {
        require(bytes(proposals[_proposalId].title).length > 0, "Proposal ID does not exist");

        proposals[_proposalId].title = _title;
        proposals[_proposalId].amount = _amount;
        proposals[_proposalId].active = _active;

        emit AirdropProposalChanged(_proposalId, _title, _amount, _active);
    }

    function airdrop(address _account, uint256 _proposalId, uint _amount) external {
        require(authorizedSigner == msg.sender, "Not authorized to register");

        // Verify that the proposal exists
        require(bytes(proposals[_proposalId].title).length > 0, "Proposal does not exist");

        // Verify that the proposal is active
        require(proposals[_proposalId].active, "Proposal is not active");

        // Verify that the sender has not voted yet for the given proposal
        require(!hasReceivedAirdrop(_proposalId, _account), "Already received airdrop");

        // Verify if amount matches
        require(_amount == proposals[_proposalId].amount, "Amount does not match");

         // Mark the sender as having voted for the given proposal
        proposals[_proposalId].received[_account] = true;

        // Increment the vote count for the chosen option of the given proposal
        proposals[_proposalId].airdropCount = proposals[_proposalId].airdropCount + 1;

        // Emit the Airdrop event
        emit Airdrop(_proposalId, _account, _amount);
    }

    // Function to self Airdrop
    function selfAirdrop(address _account, bytes32 _param, uint _timestamp, address _signer, bytes memory signature) external {

        uint256 proposalId = uint256(_param);

        // Verify that the proposal exists
        require(bytes(proposals[proposalId].title).length > 0, "Proposal does not exist");

        // Verify that the proposal is active
        require(proposals[proposalId].active, "Proposal is not active");

        // Verify that the sender has not voted yet for the given proposal
        require(!hasReceivedAirdrop(proposalId, _account), "Already received airdrop");

        uint _amount = proposals[proposalId].amount;

        // Verify payload
        authorizationContract.authorize(address(this), _account, _amount, 'selfkey.self.airdrop', _param, _timestamp, _signer, signature);

        // Mark the sender as having voted for the given proposal
        proposals[proposalId].received[_account] = true;

        // Increment the vote count for the chosen option of the given proposal
        proposals[proposalId].airdropCount = proposals[proposalId].airdropCount + 1;

        // Add to the mintable Registry
        mintableRegistryContract.register(_account, _amount, 'SELF Airdrop', 2, _signer);

        // Emit the VoteCast event
        emit Airdrop(proposalId, _account, _amount);
    }

    // Function to get the vote count for a specific option of a proposal
    function getAirdropCount(uint256 _proposalId) external view returns (uint256) {
        return proposals[_proposalId].airdropCount;
    }

    // Function to check if a user has voted for a specific proposal
    function hasReceivedAirdrop(uint256 _proposalId, address _account) public view returns (bool) {
        return proposals[_proposalId].received[_account];
    }
}
