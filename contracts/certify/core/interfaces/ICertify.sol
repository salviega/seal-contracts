// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './ICourse.sol';
import './IRegistry.sol';

interface ICertify {
	/// ======================
	/// ======= Structs ======
	/// ======================

	struct Course {
		string name;
		string symbol;
		bytes32 profileId;
		ICourse course;
		bytes32 managerRole;
		bytes32 adminRole;
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event CourseCreated(
		bytes32 indexed profileId,
		uint256 indexed courseId,
		string name,
		string symbol
	);

	event CourseUpdated(address course);

	event TreasuryUpdated(address treasury);

	event PercentFeeUpdated(uint256 percentFee);

	event BaseFeeUpdated(uint256 baseFee);

	event RegistryUpdated(address registry);

	/// ====================================
	/// ==== External/Public Functions =====
	/// ====================================

	function initialize(
		address _owner,
		address _registry,
		address _course,
		address payable _treasury
	) external;

	function createCourse(
		bytes32 _profileId,
		string memory _name,
		string memory _symbol,
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
