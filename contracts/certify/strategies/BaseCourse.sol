// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import '../core/interfaces/ICourse.sol';
import '../core/libraries/Transfer.sol';
import '../core/libraries/Errors.sol';

abstract contract BaseCourse is ICourse, Transfer, Errors {
	/// ==========================
	/// === Storage Variables ====
	/// ==========================

	ICertify internal immutable certify;
	uint256 internal courseId;

	/// ====================================
	/// =========== Modifiers ==============
	/// ====================================

	modifier onlyCertify() {
		_checkOnlyCertify();
		_;
	}

	modifier onlyCourseManager(address _sender) {
		_checkOnlyCourseManager(_sender);
		_;
	}

	modifier onlyInitialized() {
		_checkOnlyInitialized();
		_;
	}

	/// ====================================
	/// ========== Constructor =============
	/// ====================================

	constructor(address _certify) {
		certify = ICertify(_certify);
	}

	// ====================================
	// =========== Initializer ============
	// ====================================

	/// @param _courseId ID of the pool
	function __BaseStrategy_init(uint256 _courseId) internal virtual onlyCertify {
		// check if pool ID is not initialized already, if it is, revert
		if (courseId != 0) revert ALREADY_INITIALIZED();

		// check if pool ID is valid and not zero (0), if it is, revert
		if (_courseId == 0) revert INVALID();
		courseId = _courseId;
	}

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getCertify() external view override returns (ICertify) {
		return certify;
	}

	function getCourseId() external view override returns (uint256) {
		return courseId;
	}

	/// ====================================
	/// ======== Internal Functions ========
	/// ====================================

	function _checkOnlyCertify() internal view {
		if (msg.sender != address(certify)) revert UNAUTHORIZED();
	}

	function _checkOnlyCourseManager(address _sender) internal view {
		if (!certify.isCourseManager(courseId, _sender)) revert UNAUTHORIZED();
	}

	function _checkOnlyInitialized() internal view {
		if (courseId == 0) revert NOT_INITIALIZED();
	}

	/// ===================================
	/// ============== Hooks ==============
	/// ===================================
}
