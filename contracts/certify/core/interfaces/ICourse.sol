// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import './ICertify.sol';

interface ICourse {
	/// ======================
	/// ======= Enums ========
	/// ======================

	enum Status {
		None,
		Pending,
		Accepted,
		Rejected,
		Appealed,
		InReview,
		Canceled
	}

	struct PayoutSummary {
		address recipientAddress;
		uint256 amount;
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event Initialized(uint256 indexed courseId);

	event Registered(address indexed recipientId, bytes data, address sender);

	event Allocated(
		address indexed recipientId,
		uint256 amount,
		address token,
		address sender
	);

	event Distributed(
		address indexed recipientId,
		address recipientAddress,
		uint256 amount,
		address sender
	);

	event PoolActive(bool active);

	/// ======================
	/// ======= Views ========
	/// ======================

	function getCertify() external view returns (ICertify);

	function getCourseId() external view returns (uint256);

	/// ======================
	/// ===== Functions ======
	/// ======================

	function initialize(uint256 courseId) external;
}
