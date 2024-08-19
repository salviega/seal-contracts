// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import 'solady/src/tokens/ERC20.sol';
import '../core/interfaces/IActivity.sol';
import '../core/libraries/Errors.sol';
import '../core/libraries/Native.sol';
import '../core/libraries/Transfer.sol';

abstract contract BaseActivity is IActivity, Errors, Native, Transfer {
	/// ==========================
	/// === Storage Variables ====
	/// ==========================

	ISeal internal immutable seal;
	uint256 internal activityId;

	/// ====================================
	/// =========== Modifiers ==============
	/// ====================================

	modifier onlySeal() {
		_checkOnlySeal();
		_;
	}

	modifier onlyInitialized() {
		_checkOnlyInitialized();
		_;
	}

	/// ====================================
	/// ========== Constructor =============
	/// ====================================

	constructor(address _seal) {
		seal = ISeal(_seal);
	}

	// ====================================
	// =========== Initializer ============
	// ====================================

	function __BaseStrategy_init(uint256 _activityId) internal virtual onlySeal {
		// check if pool ID is not initialized already, if it is, revert
		if (activityId != 0) revert ALREADY_INITIALIZED();

		// check if pool ID is valid and not zero (0), if it is, revert
		if (_activityId == 0) revert INVALID();
		activityId = _activityId;
	}

	/// =========================
	/// ==== View Functions =====
	/// =========================

	function getSeal() external view override returns (ISeal) {
		return seal;
	}

	function getactivityId() external view override returns (uint256) {
		return activityId;
	}

	function recoverFunds(address _token, address _recipient) external onlySeal {
		uint256 amount = _token == NATIVE
			? address(this).balance
			: ERC20(_token).balanceOf(address(this));

		_transferAmount(_token, _recipient, amount);
	}

	/// ====================================
	/// ======== Internal Functions ========
	/// ====================================

	function _checkOnlyInitialized() internal view {
		if (activityId == 0) revert NOT_INITIALIZED();
	}

	function _checkOnlySeal() internal view {
		if (msg.sender != address(seal)) revert UNAUTHORIZED();
	}

	/// ===================================
	/// ============== Hooks ==============
	/// ===================================

	receive() external payable {}
}
