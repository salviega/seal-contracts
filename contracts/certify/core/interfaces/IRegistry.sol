// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRegistry {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Profile {
		uint64 attestationId;
		uint256 nonce;
		string name;
		uint256 credits;
		address owner;
		address anchor;
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event AccountAuthorizedToCreateProfile(
		address indexed account,
		bool authorized
	);

	event CreditsAddedToAccount(address indexed account, uint256 amount);

	event CreditsAddedToProfile(bytes32 indexed profileId, uint256 amount);

	event ProfileCreated(
		uint64 indexed attestationId,
		bytes32 indexed id,
		uint256 nonce,
		string name,
		uint256 credits,
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
	/// ====== Initializer ======
	/// =========================

	function initialize(address _owner, address _attestationProtocol) external;

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getAttestationProvider() external view returns (address);

	function getProfileById(
		bytes32 _profileId
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

	function addProfileManagers(
		bytes32 _profileId,
		address[] memory _managers
	) external;

	function didReceiveAttestation(
		address,
		uint64,
		uint64,
		bytes calldata extraData
	) external payable;

	function removeManagers(
		bytes32 _profileId,
		address[] memory _managers
	) external;

	function updateAttestationProvider(address _attestationProtocol) external;

	function updateProfileName(
		bytes32 _profileId,
		string memory _name
	) external returns (address anchor);

	function updateProfilePendingOwner(
		bytes32 _profileId,
		address _pendingOwner
	) external;
}
