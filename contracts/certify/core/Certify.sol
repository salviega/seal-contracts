// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import 'solady/src/auth/Ownable.sol';
import './interfaces/ICertify.sol';
import './interfaces/ICourse.sol';
import './libraries/Clone.sol';
import './libraries/Errors.sol';
import './libraries/Native.sol';
import './libraries/Metadata.sol';
import './libraries/Transfer.sol';
using ECDSA for bytes32;

contract Certify is
	Initializable,
	AccessControlUpgradeable,
	Ownable,
	Errors,
	Native,
	Transfer,
	ICertify
{
	// ==========================
	// === Storage Variables ====
	// ==========================

	mapping(address => bool) private cloneableCourses;
	mapping(address => uint256) private nonces;
	mapping(uint256 => Course) private courses;

	address private course;
	address payable private treasury;

	uint256 private courseIndex;

	IRegistry private registry;

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		address _owner,
		address _registry,
		address payable _treasury
	) external reinitializer(1) {
		_initializeOwner(_owner);

		_updateRegistry(_registry);

		_updateTreasury(_treasury);
	}

	// ====================================
	// =========== Modifier ===============
	// ====================================

	modifier onlyAttesterProtocol() {
		if (msg.sender != registry.getAttestationProtocol()) revert UNAUTHORIZED();
		_;
	}

	modifier onlyCourseAdmin(uint256 courseId) {
		_checkOnlyCourseAdmin(courseId);
		_;
	}

	modifier onlyCourseManager(uint256 courseId) {
		_checkOnlyCourseManager(courseId);
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

	function getCourseAddress(uint256 _courseId) external view returns (address) {
		return address(courses[_courseId].course);
	}

	function getRegistry() external view returns (IRegistry) {
		return registry;
	}

	function getTreasury() external view returns (address payable) {
		return treasury;
	}

	function isCloneableCourse(address _strategy) external view returns (bool) {
		return _isCloneableCourse(_strategy);
	}

	function isCourseAdmin(
		uint256 _courseId,
		address _address
	) external view returns (bool) {
		return _isCourseAdmin(_courseId, _address);
	}

	function isCourseManager(
		uint256 _courseId,
		address _address
	) external view returns (bool) {
		return _isCourseManager(_courseId, _address);
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function addToCloneableCourse(address _course) external onlyOwner {
		if (_course == address(0)) revert ZERO_ADDRESS();

		cloneableCourses[_course] = true;
		emit CourseApproved(_course);
	}

	function addCourseManagers(
		uint256 _courseId,
		address[] memory _managers
	) external onlyOwner {
		if (_managers.length == 0) revert EMPTY_ARRAY();

		uint256 managersLength = _managers.length;

		for (uint256 i; i < managersLength; ) {
			address manager = _managers[i];

			if (manager == address(0)) revert ZERO_ADDRESS();

			_grantRole(courses[_courseId].managerRole, manager);
			unchecked {
				++i;
			}
		}
	}

	function createCourse(
		bytes32 _profileId,
		uint64 _attestationId,
		address _course,
		address[] memory _managers
	) external onlyOwner returns (uint256 courseId) {
		if (!_isCloneableCourse(_course)) {
			revert NOT_APPROVED_STRATEGY();
		}

		return
			_createCourse(
				_profileId,
				msg.sender,
				_attestationId,
				ICourse(Clone.createClone(course, nonces[msg.sender]++)),
				_managers
			);
	}

	// This function is called by the attestor contract

	function didReceiveAttestation(
		address _attester,
		uint64,
		uint64 _attestationId,
		bytes calldata extraData
	) external payable onlyAttesterProtocol {
		(
			bytes32 profileId,
			address _course,
			address[] memory managers,
			bool isMint,
			uint256 courseId,
			address[] memory recipients
		) = abi.decode(
				extraData,
				(bytes32, address, address[], bool, uint256, address[])
			);

		if (isMint) {
			if (_isCourseManager(courseId, _attester)) revert UNAUTHORIZED();

			if (recipients.length == 0) revert EMPTY_ARRAY();

			for (uint256 i; i < recipients.length; ) {
				_authorizeToMint(courseId, recipients[i]);

				unchecked {
					++i;
				}
			}
		} else {
			_createCourse(
				profileId,
				_attester,
				_attestationId,
				ICourse(_course),
				managers
			);
		}
	}

	function removeFromCloneableStrategies(address _course) external onlyOwner {
		cloneableCourses[_course] = false;

		emit CourseRemoved(_course);
	}

	function removeCourseManager(
		uint256 _courseId,
		address _manager
	) external onlyCourseAdmin(_courseId) {
		_revokeRole(courses[_courseId].managerRole, _manager);
	}

	function recoverFunds(address _token, address _recipient) external onlyOwner {
		uint256 amount = _token == NATIVE
			? address(this).balance
			: ERC20Upgradeable(_token).balanceOf(address(this));

		_transferAmount(_token, _recipient, amount);
	}

	function updateRegistry(address _registry) external onlyOwner {
		_updateRegistry(_registry);
	}

	function updateTreasury(address payable _treasury) external onlyOwner {
		_updateTreasury(_treasury);
	}

	// ====================================
	// ======= Strategy Functions =========
	// ====================================

	function safeMint(
		uint256 _courseId,
		address _to,
		bytes32 _hash,
		bytes memory _signature,
		string calldata _uri
	) external verifySignature(_to, _hash, _signature) {
		_safeMint(_courseId, _to, _uri);
	}

	/// ====================================
	/// ======= Internal Functions =========
	/// ====================================

	function _authorizeToMint(uint256 _courseId, address _account) internal {
		if (!_isCourseManager(_courseId, msg.sender)) revert UNAUTHORIZED();
		courses[_courseId].course.authorizeToMint(_account);
	}

	function _checkOnlyCourseManager(uint256 _courseId) internal view {
		if (!_isCourseManager(_courseId, msg.sender)) revert UNAUTHORIZED();
	}

	function _checkOnlyCourseAdmin(uint256 _courseId) internal view {
		if (!_isCourseAdmin(_courseId, msg.sender)) revert UNAUTHORIZED();
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
		ICourse _course,
		address[] memory _managers
	) internal returns (uint256 courseId) {
		if (!registry.isOwnerOrMemberOfProfile(_profileId, _attester))
			revert UNAUTHORIZED();

		courseId = ++courseIndex;

		bytes32 COURSE_MANAGER_ROLE = bytes32(courseId);
		bytes32 COURSE_ADMIN_ROLE = keccak256(abi.encodePacked(courseId, 'admin'));

		// Create the Course instance
		Course memory newCourse = Course({
			attestationId: _attestationId,
			profileId: _profileId,
			course: _course,
			adminRole: COURSE_ADMIN_ROLE,
			managerRole: COURSE_MANAGER_ROLE
		});

		// Add the pool to the mapping of created courses
		courses[courseId] = newCourse;

		// Grant admin roles to the course creator
		_grantRole(COURSE_ADMIN_ROLE, msg.sender);

		// Set admin role for COURSE_MANAGER_ROLE
		_setRoleAdmin(COURSE_MANAGER_ROLE, COURSE_ADMIN_ROLE);

		_course.initialize(courseId);

		if (
			_course.getCourseId() != courseId ||
			address(_course.getCertify()) != address(this)
		) revert MISMATCH();

		// grant pool managers roles
		uint256 managersLength = _managers.length;
		for (uint256 i; i < managersLength; ) {
			address manager = _managers[i];
			if (manager == address(0)) revert ZERO_ADDRESS();

			_grantRole(COURSE_MANAGER_ROLE, manager);
			unchecked {
				++i;
			}
		}

		emit CourseCreated(
			newCourse.profileId,
			newCourse.attestationId,
			courseId,
			address(newCourse.course),
			newCourse.managerRole,
			newCourse.adminRole
		);
	}

	function _isCloneableCourse(address _course) internal view returns (bool) {
		return cloneableCourses[_course];
	}

	function _isCourseAdmin(
		uint256 _courseId,
		address _address
	) internal view returns (bool) {
		return hasRole(courses[_courseId].adminRole, _address);
	}

	function _isCourseManager(
		uint256 _courseId,
		address _address
	) internal view returns (bool) {
		return
			hasRole(courses[_courseId].managerRole, _address) ||
			_isCourseAdmin(_courseId, _address);
	}

	function _safeMint(
		uint256 _courseId,
		address _to,
		string calldata _uri
	) internal {
		courses[_courseId].course.safeMint(_to, _uri);
	}

	function _updateCourse(address _course) internal {
		if (_course == address(0)) revert ZERO_ADDRESS();

		course = _course;
		emit CourseUpdated(_course);
	}

	function _updateRegistry(address _registry) internal {
		if (_registry == address(0)) revert ZERO_ADDRESS();

		registry = IRegistry(_registry);
		emit RegistryUpdated(_registry);
	}

	function _updateTreasury(address payable _treasury) internal {
		if (_treasury == address(0)) revert ZERO_ADDRESS();

		treasury = _treasury;
		emit TreasuryUpdated(treasury);
	}
}
