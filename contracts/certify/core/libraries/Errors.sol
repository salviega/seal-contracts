// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Errors {
	/// ======================
	/// ====== Generic =======
	/// ======================

	/// @notice Thrown when array length is zero
	error EMPTY_ARRAY();

	/// @notice Thrown as a general error when input / data is invalid
	error INVALID();

	/// @notice Thrown when mismatch in decoding data
	error MISMATCH();

	/// @notice Thrown when user is not authorized
	error UNAUTHORIZED();

	/// @notice Thrown when address is the zero address
	error ZERO_ADDRESS();

	/// ======================
	/// ====== Registry ======
	/// ======================

	/// @dev Thrown when the nonce passed has been used or not available
	error NONCE_NOT_AVAILABLE();

	/// @dev Thrown when the 'msg.sender' is not the pending owner on ownership transfer
	error NOT_PENDING_OWNER();

	/// @dev Thrown if the anchor creation fails
	error ANCHOR_ERROR();

	/// =========================
	/// ======== Certify ========
	/// =========================

	/// @notice Thrown when the strategy is not approved
	error NOT_APPROVED_STRATEGY();

	/// ======================
	/// ===== ICourse ========
	/// ======================

	/// @notice Thrown when data is already intialized
	error ALREADY_INITIALIZED();

	/// @notice Thrown when data is yet to be initialized
	error NOT_INITIALIZED();

	/// @notice Thrown when the sender is not authorized
	error ALREADY_AUTHORIZED();

	/// @notice Thrown when the address cannot mint.
	error CANNOT_MINT();
}
