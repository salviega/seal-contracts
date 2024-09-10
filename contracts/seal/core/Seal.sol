// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import 'solady/src/auth/Ownable.sol';
import 'solady/src/tokens/ERC20.sol';
import './interfaces/ISeal.sol';
import './interfaces/IActivity.sol';
import './libraries/Clone.sol';
import './libraries/Errors.sol';
import './libraries/Native.sol';
import './libraries/Transfer.sol';

contract Seal is Initializable, Ownable, Errors, Native, Transfer, ISeal {
	/// =========================
	/// === Storage Variables ===
	/// =========================

	mapping(address => uint256) private nonces;
	mapping(uint256 => Activity) private activities;

	address private strategy;
	IRegistry private registry;
	uint256 public activityIdCounter;

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		address _owner,
		address _registry
	) external reinitializer(1) {
		if (_owner == address(0)) revert ZERO_ADDRESS();
		if (_registry == address(0)) revert ZERO_ADDRESS();

		_initializeOwner(_owner);
		_updateRegistry(_registry);
	}

	/// =========================
	/// ======= Modifiers =======
	/// =========================

	modifier onlyAttestationProvider() {
		if (msg.sender != registry.getAttestationProvider())
			revert NOT_ATTESTATION_PROVIDER();
		_;
	}

	// =========================
	// ==== View Functions =====
	// =========================

	function getActivityById(
		uint256 _activityId
	) external view returns (Activity memory) {
		return activities[_activityId];
	}

	function getRegistry() external view returns (IRegistry) {
		return registry;
	}

	function getStrategy() external view returns (address) {
		return strategy;
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function recoverFunds(address _token, address _recipient) external onlyOwner {
		if (_recipient == address(0)) revert ZERO_ADDRESS();

		uint256 amount = _token == NATIVE
			? address(this).balance
			: ERC20(_token).balanceOf(address(this));

		_transferAmount(_token, _recipient, amount);
	}

	function updateRegistry(address _registry) external onlyOwner {
		_updateRegistry(_registry);
	}

	function updateStrategy(address _strategy) external onlyOwner {
		_updateStrategy(_strategy);
	}

	// This function is called by the attestor contract

	function didReceiveAttestation(
		address _attester,
		uint64,
		uint64 _attestationId,
		bytes calldata extraData
	) external payable onlyAttestationProvider {
		(bytes32 profileId, address[] memory recipients, string[] memory uris) = abi
			.decode(extraData, (bytes32, address[], string[]));

		if (recipients.length == 0) revert EMPTY_ARRAY();

		Activity memory activity = _createActivity(
			profileId,
			_attester,
			_attestationId,
			recipients.length
		);

		if (recipients.length != uris.length) revert MISMATCH();

		for (uint256 i; i < recipients.length; ) {
			if (recipients[i] == address(0)) revert ZERO_ADDRESS();

			activity.activity.safeMint(recipients[i], uris[i]);

			unchecked {
				++i;
			}
		}
	}

	// ====================================
	// ======= Strategy Functions =========
	// ====================================

	function recoverFundsOfActivity(
		uint256 _activityId,
		address _token,
		address _recipient
	) external onlyOwner {
		activities[_activityId].activity.recoverFunds(_token, _recipient);
	}

	/// ====================================
	/// ======= Internal Functions =========
	/// ====================================

	function _createActivity(
		bytes32 _profileId,
		address _attester,
		uint64 _attestationId,
		uint256 _credits
	) internal returns (Activity memory activity) {
		if (!registry.isOwnerOrManagerOfProfile(_profileId, _attester))
			revert UNAUTHORIZED();

		uint256 activityId = ++activityIdCounter;

		IActivity newActivity = IActivity(
			Clone.createClone(strategy, nonces[_attester]++)
		);

		activity = Activity({
			profileId: _profileId,
			attestationId: _attestationId,
			activity: newActivity,
			credits: _credits
		});

		activities[activityId] = activity;

		newActivity.initialize(activityId);

		if (
			newActivity.getActivityId() != activityId ||
			address(newActivity.getSeal()) != address(this)
		) revert MISMATCH();

		emit ActivityCreated(
			activityId,
			activity.profileId,
			activity.attestationId,
			address(activity.activity),
			activity.credits
		);
	}

	function _updateRegistry(address _registry) internal {
		if (_registry == address(0)) revert ZERO_ADDRESS();

		registry = IRegistry(_registry);
		emit RegistryUpdated(_registry);
	}

	function _updateStrategy(address _strategy) internal {
		if (_strategy == address(0)) revert ZERO_ADDRESS();

		strategy = _strategy;
		emit ActivityUpdated(_strategy);
	}

	receive() external payable {}
}
