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

	// @notice Thrown when amount is zero or less
	error INVALID_AMOUNT();

	/// @notice Thrown when the address is the same
	error SAME_PROVIDER();

	/// @notice Thrown when the address is this contract address
	error SAME_CONTRACT();

	/// @notice Thrown when address is the zero address
	error ZERO_ADDRESS();

	/// ======================
	/// ====== Registry ======
	/// ======================

	/// @notice Thrown when the authorizations are the same
	error SAME_STATUS();

	/// @dev Thrown when the profile is not found
	error PROFILE_NOT_FOUND();

	/// @dev Thrown when the nonce passed has been used or not available
	error NONCE_NOT_AVAILABLE();

	/// @dev Thrown when the 'msg.sender' is not the pending owner on ownership transfer
	error NOT_PENDING_OWNER();

	/// @dev Thrown when the 'msg.sender' has not have credits
	error NOT_HAVE_CEDRITS();

	/// @dev Thrown if the anchor creation fails
	error ANCHOR_ERROR();

	/// =========================
	/// ======== Certify ========
	/// =========================

	/// @notice Thrown when sender is not attestation provider
	error NOT_ATTESTATION_PROVIDER();

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

	/// @notice Thrown when the profile has insufficient credits
	error INSUFFICIENT_CREDITS();
}
