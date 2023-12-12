// SPDX-License-Identifier: proprietary
pragma solidity 0.8.19;

interface ISelfkeyDaoSelfAirdrop {

    // Struct to represent an airdrop proposal
    struct AirdropProposal {
        string title;
        mapping(address => bool) received;
        uint256 airdropCount;
        bool active;
        uint amount;
    }

    event AuthorizationContractAddressChanged(address indexed _address);

    event AirdropProposalCreated(uint256 proposalId, string title, uint amount, bool active);

    event AirdropProposalChanged(uint256 proposalId, string title, uint amount, bool active);

    event Airdrop(uint256 indexed proposalId, address indexed voter, uint256 votes);

    function initialize(address _authorizationContract) external;

    function setAuthorizationContractAddress(address _newAuthorizationContractAddress) external;

    function createAirdropProposal(string memory _title, uint _amount, bool _active) external;

    function updateAirdropProposal(uint256 _proposalId, string memory _title, uint _amount, bool _active) external;

    function airdrop(address _account, bytes32 _param, uint _timestamp, address _signer, bytes memory signature) external;

    function getAirdropCount(uint256 _proposalId) external view returns (uint256);

    function hasReceivedAirdrop(uint256 _proposalId, address _voter) external view returns (bool);

    function numProposals() external view returns (uint256);

}
