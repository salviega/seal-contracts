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

	event AttestationProviderUpdated(address indexed attestationProtocol);

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

	function getAttestationProvider()
		external
		view
		returns (address attestationProtocol);

	function getCreditsByProfileId(
		bytes32 _profileId
	) external view returns (uint256 credits);

	function getProfileById(
		bytes32 _profileId
	) external view returns (Profile memory profile);

	function getProfileIdByAnchor(
		address _anchor
	) external view returns (bytes32 profileId);

	function isManagerOfProfile(
		bytes32 _profileId,
		address _manager
	) external view returns (bool isManagerOfProfile);

	function isOwnerOfProfile(
		bytes32 _profileId,
		address _owner
	) external view returns (bool isOwnerOfProfile);

	function isOwnerOrManagerOfProfile(
		bytes32 _profileId,
		address _account
	) external view returns (bool isOwnerOrManagerOfProfile);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function addCreditsToAccount(address _account, uint256 _amount) external;

	function addCreditsToProfile(bytes32 _profileId, uint256 _amount) external;

	function acceptProfileOwnership(bytes32 _profileId) external;

	function addManagersToProfile(
		bytes32 _profileId,
		address[] memory _managers
	) external;

	function didReceiveAttestation(
		address,
		uint64,
		uint64,
		bytes calldata extraData
	) external payable;

	function removeManagersFromProfile(
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
