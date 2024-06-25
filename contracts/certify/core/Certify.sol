// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import 'solady/src/auth/Ownable.sol';
import 'solady/src/tokens/ERC20.sol';
import './interfaces/ICertify.sol';
import './interfaces/ICourse.sol';
import './libraries/Clone.sol';
import './libraries/Errors.sol';
import './libraries/Native.sol';
import './libraries/Transfer.sol';
using ECDSA for bytes32;

contract Certify is Initializable, Ownable, Errors, Native, Transfer, ICertify {
	// ==========================
	// === Storage Variables ====
	// ==========================

	mapping(address => uint256) private nonces;
	mapping(uint256 => Course) private courses;

	address private strategy;

	IRegistry private registry;

	uint256 private courseIdCounter;

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		address _owner,
		address _registry,
		address _strategy
	) external reinitializer(1) {
		_initializeOwner(_owner);
		_updateRegistry(_registry);
		_updateStrategy(_strategy);
	}

	// ====================================
	// =========== Modifier ===============
	// ====================================

	modifier onlyAttestationProvider() {
		if (msg.sender != registry.getAttestationProvider())
			revert NOT_ATTESTATION_PROVIDER();
		_;
	}

	modifier verifySignature(
		address _signer,
		bytes32 _hash,
		bytes memory _signature
	) {
		_checkSigner(_signer, _hash, _signature);
		_;
	}

	// =========================
	// ==== View Functions =====
	// =========================

	function getCourse(uint256 _courseId) external view returns (Course memory) {
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

	// This function is called by the attestor contract

	function didReceiveAttestation(
		address _attester,
		uint64,
		uint64 _attestationId,
		bytes calldata extraData
	) external payable onlyAttestationProvider {
		(bytes32 profileId, address[] memory recipients) = abi.decode(
			extraData,
			(bytes32, address[])
		);

		uint256 courseId = _createCourse(
			profileId,
			_attester,
			_attestationId,
			ICourse(Clone.createClone(strategy, nonces[_attester]++))
		);

		if (recipients.length == 0) revert EMPTY_ARRAY();

		for (uint256 i; i < recipients.length; ) {
			_authorizeToMint(courseId, recipients[i]);

			unchecked {
				++i;
			}
		}
	}

	function recoverFunds(address _token, address _recipient) external onlyOwner {
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

	function safeMint(
		uint256 _courseId,
		bytes32 _hash,
		bytes memory _signature,
		string calldata _uri
	) external verifySignature(msg.sender, _hash, _signature) {
		_safeMint(_courseId, msg.sender, _uri);
	}

	/// ====================================
	/// ======= Internal Functions =========
	/// ====================================

	function _authorizeToMint(uint256 _courseId, address _account) internal {
		courses[_courseId].course.authorizeToMint(_account);
	}

	function _checkSigner(
		address _signer,
		bytes32 _hash,
		bytes memory _signature
	) internal pure {
		bool isSigner = _hash.recover(_signature) == _signer;
		if (!isSigner) revert UNAUTHORIZED();
	}

	function _createCourse(
		bytes32 _profileId,
		address _attester,
		uint64 _attestationId,
		ICourse _course
	) internal returns (uint256 courseId) {
		if (!registry.isOwnerOrMemberOfProfile(_profileId, _attester))
			revert UNAUTHORIZED();

		courseId = ++courseIdCounter;

		Course memory course = Course({
			profileId: _profileId,
			attestationId: _attestationId,
			course: _course
		});

		courses[courseId] = course;

		_course.initialize(courseId);

		if (
			_course.getCourseId() != courseId ||
			address(_course.getCertify()) != address(this)
		) revert MISMATCH();

		emit CourseCreated(
			courseId,
			course.profileId,
			course.attestationId,
			address(course.course)
		);
	}

	function _safeMint(
		uint256 _courseId,
		address _to,
		string calldata _uri
	) internal {
		courses[_courseId].course.safeMint(_to, _uri);
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
}
