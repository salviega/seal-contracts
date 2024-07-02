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
		Accepted
	}

	/// ======================
	/// ======= Events =======
	/// ======================

	event Initialized(uint256 indexed courseId);

	event Registered(address indexed recipientId, bytes data, address sender);

	event AuthorizedToMint(
		address sender,
		address indexed account,
		Status status
	);

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

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(uint256 courseId) external;

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getCertify() external view returns (ICertify);

	function getCourseId() external view returns (uint256);

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function recoverFunds(address token, address recipient) external;

	function safeMint(address to, string memory uri) external returns (uint256);
}
