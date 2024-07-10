// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import 'solady/src/auth/Ownable.sol';
import 'solady/src/tokens/ERC20.sol';
import './interfaces/ISeal.sol';
import './interfaces/ICourse.sol';
import './libraries/Clone.sol';
import './libraries/Errors.sol';
import './libraries/Native.sol';
import './libraries/Transfer.sol';

contract Seal is Initializable, Ownable, Errors, Native, Transfer, ISeal {
	/// =========================
	/// === Storage Variables ===
	/// =========================

	mapping(address => uint256) private nonces;
	mapping(uint256 => Course) private courses;

	address public strategy;
	IRegistry public registry;
	uint256 public courseIdCounter;

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

	function getCourseById(
		uint256 _courseId
	) external view returns (Course memory) {
		return courses[_courseId];
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

		if (registry.getProfileById(profileId).credits < recipients.length) {
			revert INSUFFICIENT_CREDITS();
		}

		if (recipients.length == 0) revert EMPTY_ARRAY();

		registry.getProfileById(profileId).credits -= recipients.length;

		Course memory course = _createCourse(
			profileId,
			_attester,
			_attestationId,
			recipients.length
		);

		if (recipients.length != uris.length) revert MISMATCH();

		for (uint256 i; i < recipients.length; ) {
			if (recipients[i] == address(0)) revert ZERO_ADDRESS();

			course.course.safeMint(recipients[i], uris[i]);

			unchecked {
				++i;
			}
		}
	}

	// ====================================
	// ======= Strategy Functions =========
	// ====================================

	function recoverFundsOfCourse(
		uint256 _courseId,
		address _token,
		address _recipient
	) external onlyOwner {
		courses[_courseId].course.recoverFunds(_token, _recipient);
	}

	/// ====================================
	/// ======= Internal Functions =========
	/// ====================================

	function _createCourse(
		bytes32 _profileId,
		address _attester,
		uint64 _attestationId,
		uint256 _credits
	) internal returns (Course memory course) {
		if (!registry.isOwnerOrManagerOfProfile(_profileId, _attester))
			revert UNAUTHORIZED();

		uint256 courseId = ++courseIdCounter;

		ICourse newCourse = ICourse(
			Clone.createClone(strategy, nonces[_attester]++)
		);

		course = Course({
			profileId: _profileId,
			attestationId: _attestationId,
			course: newCourse,
			credits: _credits
		});

		courses[courseId] = course;

		newCourse.initialize(courseId);

		if (
			newCourse.getCourseId() != courseId ||
			address(newCourse.getSeal()) != address(this)
		) revert MISMATCH();

		emit CourseCreated(
			courseId,
			course.profileId,
			course.attestationId,
			address(course.course),
			course.credits
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
		emit CourseUpdated(_strategy);
	}

	receive() external payable {}
}
