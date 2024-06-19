// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './ICourse.sol';
import './IRegistry.sol';

interface ICertify {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Course {
		bytes32 profileId;
		uint64 attestationId;
		uint256 courseId;
		ICourse course;
		bytes32 adminRole;
		bytes32 managerRole;
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event CourseCreated(
		bytes32 indexed profileId,
		uint64 indexed attestationId,
		uint256 indexed courseId,
		address course,
		bytes32 managerRole,
		bytes32 adminRole
	);

	event BaseFeeUpdated(uint256 baseFee);

	event CourseApproved(address course);

	event CourseRemoved(address course);

	event CourseUpdated(address course);

	event PercentFeeUpdated(uint256 percentFee);

	event RegistryUpdated(address registry);

	event TreasuryUpdated(address treasury);

	/// ====================================
	/// ==== External/Public Functions =====
	/// ====================================

	function initialize(
		address _owner,
		address _registry,
		address payable _treasury
	) external;

	function createCourse(
		bytes32 _profileId,
		uint64 _attestationId,
		address _course,
		address[] memory _managers
	) external returns (uint256 courseId);

	function addCourseManager(uint256 _courseId, address _manager) external;

	function removeCourseManager(uint256 _courseId, address _manager) external;

	function recoverFunds(address _token, address _recipient) external;

	function updateBaseFee(uint256 _baseFee) external;

	function updatePercentFee(uint256 _percentFee) external;

	function updateRegistry(address _registry) external;

	function updateTreasury(address payable _treasury) external;

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getAddress(uint256 _courseId) external view returns (address);

	function getCourse(uint256 _courseId) external view returns (Course memory);

	function getRegistry() external view returns (IRegistry);

	function getTreasury() external view returns (address payable);

	function isCourseAdmin(
		uint256 _courseId,
		address _address
	) external view returns (bool);

	function isCourseManager(
		uint256 _courseId,
		address _address
	) external view returns (bool);
}
