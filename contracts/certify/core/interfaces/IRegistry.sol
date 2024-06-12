// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRegistry {
	struct Profile {
		bytes32 id;
		uint256 nonce;
		string name;
		address owner;
		address anchor;
	}

	event ProfileCreated(
		bytes32 indexed profileId,
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

	/// ====================================
	/// ==== External/Public Functions =====
	/// ====================================

	// function createProfile(
	// 	uint256 _nonce,
	// 	string memory _name,
	// 	address _owner,
	// 	address[] memory _members
	// ) external returns (bytes32 profileId);

	function updateProfileName(
		bytes32 _profileId,
		string memory _name
	) external returns (address anchor);

	function updateProfilePendingOwner(
		bytes32 _profileId,
		address _pendingOwner
	) external;

	function acceptProfileOwnership(bytes32 _profileId) external;

	function addMembers(bytes32 _profileId, address[] memory _members) external;

	function removeMembers(
		bytes32 _profileId,
		address[] memory _members
	) external;

	function recoverFunds(address _token, address _recipient) external;
}
