// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRegistry {
	struct Profile {
		uint64 attestationId;
		bytes32 id;
		uint256 nonce;
		string name;
		address owner;
		address anchor;
	}

	event AccountAuthorizedToCreateProfile(
		address indexed account,
		bool authorized
	);

	event ProfileCreated(
		uint64 indexed attestationId,
		bytes32 indexed id,
		uint256 nonce,
		string name,
		address owner,
		address anchor
	);

	event ProfileNameUpdated(
		bytes32 indexed profileId,
		string name,
		address anchor
	);

	event ProfileOwnerUpdated(bytes32 indexed profileId, address owner);

	event ProfilePendingOwnerUpdated(
		bytes32 indexed profileId,
		address pendingOwner
	);

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getAttestationProtocol() external view returns (address);

	function getProfileById(
		bytes32 _profileId
	) external view returns (Profile memory profile);

	function getProfileByAnchor(
		address _anchor
	) external view returns (Profile memory profile);

	function isOwnerOrMemberOfProfile(
		bytes32 _profileId,
		address _account
	) external view returns (bool isOwnerOrMemberOfProfile);

	function isOwnerOfProfile(
		bytes32 _profileId,
		address _owner
	) external view returns (bool isOwnerOfProfile);

	function isMemberOfProfile(
		bytes32 _profileId,
		address _member
	) external view returns (bool isMemberOfProfile);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function acceptProfileOwnership(bytes32 _profileId) external;

	function addMembers(bytes32 _profileId, address[] memory _members) external;

	function recoverFunds(address _token, address _recipient) external;

	function didReceiveAttestation(
		address,
		uint64,
		uint64,
		bytes calldata extraData
	) external payable;

	function removeMembers(
		bytes32 _profileId,
		address[] memory _members
	) external;

	function updateAttestationProtocol(address _attestationProtocol) external;

	function updateProfileName(
		bytes32 _profileId,
		string memory _name
	) external returns (address anchor);

	function updateProfilePendingOwner(
		bytes32 _profileId,
		address _pendingOwner
	) external;
}
