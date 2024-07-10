// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './ICourse.sol';
import './IRegistry.sol';

interface ISeal {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Course {
		bytes32 profileId;
		uint64 attestationId;
		ICourse course;
		uint256 credits;
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event CourseCreated(
		uint256 indexed courseId,
		bytes32 indexed profileId,
		uint64 indexed attestationId,
		address course,
		uint256 credits
	);

	event CourseApproved(address course);

	event CourseRemoved(address course);

	event CourseUpdated(address course);

	event RegistryUpdated(address registry);

	event TreasuryUpdated(address treasury);

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(address _owner, address _registry) external;

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getCourse(uint256 _courseId) external view returns (Course memory);

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

	function recoverFundsOfCourse(
		uint256 _courseId,
		address _token,
		address _recipient
	) external;
}
