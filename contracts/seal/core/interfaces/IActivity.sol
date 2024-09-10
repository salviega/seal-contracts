// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './ISeal.sol';

interface IActivity {
	/// ======================
	/// ======= Events =======
	/// ======================

	event Initialized(uint256 indexed activityId);

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(uint256 activityId) external;

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getSeal() external view returns (ISeal);

	function getActivityId() external view returns (uint256);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function recoverFunds(address token, address recipient) external;

	function safeMint(address to, string memory uri) external returns (uint256);
}
