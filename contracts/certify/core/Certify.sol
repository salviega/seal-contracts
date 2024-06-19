// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import 'solady/src/auth/Ownable.sol';
import './interfaces/ICertify.sol';
import './interfaces/ICourse.sol';
import './libraries/Clone.sol';
import './libraries/Errors.sol';
import './libraries/Native.sol';
import './libraries/Metadata.sol';
import './libraries/Transfer.sol';

contract Certify is
	ICertify,
	Native,
	Transfer,
	Ownable,
	Initializable,
	AccessControlUpgradeable,
	ReentrancyGuardUpgradeable,
	Errors
{
	// ==========================
	// === Storage Variables ====
	// ==========================

	mapping(address => bool) private cloneableStrategies;
	mapping(address => uint256) private nonces;
	mapping(uint256 => Course) private courses;

	address private course;
	address payable private treasury;

	uint256 internal baseFee;
	uint256 private percentFee;
	uint256 private courseIndex;

	IRegistry private registry;

	// ====================================
	// =========== Modifier ===============
	// ====================================

	modifier onlyCourseAdmin(uint256 courseId) {
		_checkOnlyCourseAdmin(courseId);
		_;
	}

	modifier onlyCourseManager(uint256 courseId) {
		_checkOnlyCourseManager(courseId);
		_;
	}

	// ====================================
	// =========== Initializer ============
	// ====================================

	function initialize(
		address _owner,
		address _registry,
		address _course,
		address payable _treasury
	) external reinitializer(1) {
		_initializeOwner(_owner);

		_updateRegistry(_registry);

		_updateCourse(_course);
		// TODO: implement the following function
		_updateBaseFee(0);
		// TODO: implement the following function
		_updatePercentFee(0);

		_updateTreasury(_treasury);
	}

	// =========================
	// ==== View Functions =====
	// =========================

	function getAddress(uint256 _courseId) external view returns (address) {
		return address(courses[_courseId].course);
	}

	function getCourse(uint256 _courseId) external view returns (Course memory) {
		return courses[_courseId];
	}

	function getRegistry() external view returns (IRegistry) {
		return registry;
	}

	function getTreasury() external view returns (address payable) {
		return treasury;
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

	//  ====================================
	//  ==== External/Public Functions =====
	//  ====================================

	function addCourseManager(
		uint256 _courseId,
		address _manager
	) external onlyCourseAdmin(_courseId) {
		if (_manager == address(0)) revert ZERO_ADDRESS();
		_grantRole(courses[_courseId].managerRole, _manager);
	}

	function createCourse(
		bytes32 _profileId,
		string memory _name,
		string memory _symbol,
		address[] memory _managers
	) external returns (uint256 courseId) {
		return
			_createCourse(
				_name,
				_symbol,
				_profileId,
				ICourse(Clone.createClone(course, nonces[msg.sender]++)),
				_managers
			);
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

	function updateBaseFee(uint256 _baseFee) external onlyOwner {
		_updateBaseFee(_baseFee);
	}

	function updatePercentFee(uint256 _percentFee) external onlyOwner {
		_updatePercentFee(_percentFee);
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

	// TODO: implement the following function

	/// ====================================
	/// ======= Internal Functions =========
	/// ====================================

	/// @notice Internal function to check is caller is pool manager
	/// @param _courseId The pool id
	function _checkOnlyCourseManager(uint256 _courseId) internal view {
		if (!_isCourseManager(_courseId, msg.sender)) revert UNAUTHORIZED();
	}

	/// @notice Internal function to check is caller is pool admin
	/// @param _courseId The pool id
	function _checkOnlyCourseAdmin(uint256 _courseId) internal view {
		if (!_isCourseAdmin(_courseId, msg.sender)) revert UNAUTHORIZED();
	}

	function _createCourse(
		string memory _name,
		string memory _symbol,
		bytes32 _profileId,
		ICourse _course,
		address[] memory _managers
	) internal returns (uint256 courseId) {
		if (!registry.isOwnerOrMemberOfProfile(_profileId, msg.sender))
			revert UNAUTHORIZED();

		courseId = ++courseIndex;

		bytes32 COURSE_MANAGER_ROLE = bytes32(courseId);
		bytes32 COURSE_ADMIN_ROLE = keccak256(abi.encodePacked(courseId, 'admin'));

		// Create the Course instance
		Course memory newCourse = Course({
			name: _name,
			symbol: _symbol,
			course: _course,
			profileId: _profileId,
			managerRole: COURSE_MANAGER_ROLE,
			adminRole: COURSE_ADMIN_ROLE
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

		emit CourseCreated(_profileId, courseId, _name, _symbol);
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

	function _updatePercentFee(uint256 _percentFee) internal {
		if (_percentFee > 1e18) revert INVALID_FEE();

		percentFee = _percentFee;

		emit PercentFeeUpdated(percentFee);
	}

	function _updateBaseFee(uint256 _baseFee) internal {
		baseFee = _baseFee;

		emit BaseFeeUpdated(baseFee);
	}
}
