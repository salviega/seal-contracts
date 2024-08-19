// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './IActivity.sol';
import './IRegistry.sol';

interface ISeal {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Activity {
		bytes32 profileId;
		uint64 attestationId;
		IActivity activity;
		uint256 credits;
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event ActivityCreated(
		uint256 indexed activityId,
		bytes32 indexed profileId,
		uint64 indexed attestationId,
		address activity,
		uint256 credits
	);

	event ActivityApproved(address activity);

	event ActivityRemoved(address activity);

	event ActivityUpdated(address activity);

	event RegistryUpdated(address registry);

	event TreasuryUpdated(address treasury);

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(address _owner, address _registry) external;

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getActivityById(
		uint256 _activityId
	) external view returns (Activity memory);

	function getRegistry() external view returns (IRegistry);

	function getStrategy() external view returns (address);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function didReceiveAttestation(
		address _attester,
		uint64,
		uint64 _attestationId,
		bytes calldata extraData
	) external payable;

	function updateRegistry(address _registry) external;

	function updateStrategy(address _strategy) external;

	// ====================================
	// ======= Strategy Functions =========
	// ====================================

	function recoverFundsOfActivity(
		uint256 _activityId,
		address _token,
		address _recipient
	) external;
}
