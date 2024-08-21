// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import './Anchor.sol';
import './interfaces/IRegistry.sol';
import './libraries/Errors.sol';
import './libraries/Native.sol';
import './libraries/Transfer.sol';

contract Registry is
	IRegistry,
	Errors,
	Native,
	Transfer,
	Initializable,
	AccessControlUpgradeable,
	MulticallUpgradeable
{
	/// =========================
	/// === Storage Variables ===
	/// =========================

	mapping(address account => bool) private authorizations;
	mapping(address anchor => bytes32) private profileIds;
	mapping(bytes32 profileId => Profile) private profiles;
	mapping(bytes32 profileId => address) private pendingOwners;
	mapping(address profileOwner => uint256) private credits;

	bytes32 public constant SEAL_OWNER = keccak256('SEAL_OWNER');
	address public attestationProvider;

	/// =========================
	/// ====== Initializer ======
	/// =========================

	function initialize(
		address _owner,
		address _attestationProvider
	) external reinitializer(1) {
		if (_owner == address(0)) revert ZERO_ADDRESS();
		if (_attestationProvider == address(0)) revert ZERO_ADDRESS();

		_updateAttestationProvider(_attestationProvider);
		_grantRole(SEAL_OWNER, _owner);
	}

	/// =========================
	/// ======= Modifiers =======
	/// =========================

	modifier onlyAttestationProvider() {
		if (msg.sender != attestationProvider) revert NOT_ATTESTATION_PROVIDER();
		_;
	}

	modifier onlyProfileOwner(bytes32 _profileId) {
		_checkOnlyProfileOwner(_profileId);
		_;
	}

	/// ==========================
	/// ===== View Functions =====
	/// ==========================

	function getAttestationProvider() external view returns (address) {
		return attestationProvider;
	}

	function getCreditsByAccount(
		address _account
	) external view returns (uint256) {
		return credits[_account];
	}

	function getCreditsByProfileId(
		bytes32 _profileId
	) external view returns (uint256) {
		return profiles[_profileId].credits;
	}

	function getPendingOwnerByProfileId(
		bytes32 _profileId
	) external view returns (address) {
		return pendingOwners[_profileId];
	}

	function getProfileIdByAnchor(
		address _anchor
	) external view returns (bytes32) {
		return profileIds[_anchor];
	}

	function getProfileById(
		bytes32 _profileId
	) external view returns (Profile memory) {
		return profiles[_profileId];
	}

	function isAuthorizedToCreateProfile(
		address _account
	) external view returns (bool) {
		return _isAuthorizedToCreateProfile(_account);
	}

	function isManagerOfProfile(
		bytes32 _profileId,
		address _manager
	) external view returns (bool) {
		return _isManagerOfProfile(_profileId, _manager);
	}

	function isOwnerOfProfile(
		bytes32 _profileId,
		address _owner
	) external view returns (bool) {
		return _isOwnerOfProfile(_profileId, _owner);
	}

	function isOwnerOrManagerOfProfile(
		bytes32 _profileId,
		address _account
	) external view returns (bool) {
		return
			_isOwnerOfProfile(_profileId, _account) ||
			_isManagerOfProfile(_profileId, _account);
	}

	/// =================================
	/// == External / Public Functions ==
	/// =================================

	function acceptProfileOwnership(bytes32 _profileId) external {
		Profile storage profile = profiles[_profileId];

		address newOwner = pendingOwners[_profileId];

		if (msg.sender != newOwner) revert NOT_PENDING_OWNER();

		profile.owner = newOwner;
		delete pendingOwners[_profileId];

		emit ProfileOwnerUpdated(_profileId, profile.owner);
	}

	function addCreditsToAccount(
		address _account,
		uint256 _amount
	) external onlyRole(SEAL_OWNER) {
		if (_account == address(0)) revert ZERO_ADDRESS();
		if (_amount < 1) revert INVALID_AMOUNT();
		credits[_account] += _amount;

		emit CreditsAddedToAccount(_account, _amount);
	}

	function addCreditsToProfile(
		bytes32 _profileId,
		uint256 _amount
	) external onlyRole(SEAL_OWNER) {
		Profile storage profile = profiles[_profileId];

		if (profile.owner == address(0)) revert PROFILE_NOT_FOUND();
		if (_amount < 1) revert INVALID_AMOUNT();
		profile.credits += _amount;

		emit CreditsAddedToProfile(_profileId, _amount);
	}

	function addManagersToProfile(
		bytes32 _profileId,
		address[] memory _managers
	) external onlyProfileOwner(_profileId) {
		if (_managers.length == 0) revert EMPTY_ARRAY();

		for (uint256 i; i < _managers.length; ) {
			address manager = _managers[i];
			if (manager == address(0)) revert ZERO_ADDRESS();

			_grantRole(_profileId, manager);

			unchecked {
				++i;
			}
		}
	}

	function authorizeProfileCreation(
		address _account,
		bool _status
	) external onlyRole(SEAL_OWNER) {
		if (_account == address(0)) revert ZERO_ADDRESS();
		if (authorizations[_account] == _status) revert SAME_STATUS();

		authorizations[_account] = _status;
		emit AccountAuthorizedToCreateProfile(_account, _status);
	}

	function recoverFunds(
		address _token,
		address _recipient
	) external onlyRole(SEAL_OWNER) {
		if (_recipient == address(0)) revert ZERO_ADDRESS();

		uint256 amount = _token == NATIVE
			? address(this).balance
			: IERC20(_token).balanceOf(address(this));
		_transferAmount(_token, _recipient, amount);
	}

	function reduceCredits(
		bytes32 _profileId,
		uint256 _amount
	) external onlyRole(SEAL_OWNER) {
		if (_amount < 1) revert INVALID_AMOUNT();

		Profile storage profile = profiles[_profileId];
		if (profile.owner == address(0)) revert PROFILE_NOT_FOUND();
		if (profile.credits < _amount) revert INSUFFICIENT_CREDITS();
		profile.credits -= _amount;

		emit CreditsReduced(_profileId, _amount);
	}

	function removeManagersFromProfile(
		bytes32 _profileId,
		address[] memory _managers
	) external onlyProfileOwner(_profileId) {
		if (_managers.length == 0) revert EMPTY_ARRAY();

		for (uint256 i; i < _managers.length; ) {
			address manager = _managers[i];
			if (manager == address(0)) revert ZERO_ADDRESS();

			_revokeRole(_profileId, manager);
			unchecked {
				++i;
			}
		}
	}

	function updateAttestationProvider(
		address _attestationProvider
	) external onlyRole(SEAL_OWNER) {
		_updateAttestationProvider(_attestationProvider);
	}

	function updateProfileName(
		bytes32 _profileId,
		string memory _name
	) external onlyProfileOwner(_profileId) returns (address anchor) {
		anchor = _generateAnchor(_profileId, _name);

		Profile storage profile = profiles[_profileId];

		profile.name = _name;

		profileIds[profile.anchor] = bytes32(0);

		profile.anchor = anchor;
		profileIds[anchor] = _profileId;

		emit ProfileNameUpdated(_profileId, _name, anchor);

		return anchor;
	}

	function updateProfilePendingOwner(
		bytes32 _profileId,
		address _pendingOwner
	) external onlyProfileOwner(_profileId) {
		if (_pendingOwner == address(0)) revert ZERO_ADDRESS();
		if (_pendingOwner == profiles[_profileId].owner) revert SAME_PROVIDER();

		pendingOwners[_profileId] = _pendingOwner;

		emit ProfilePendingOwnerUpdated(_profileId, _pendingOwner);
	}

	// This function is called by the attestor contract

	function didReceiveAttestation(
		address _attester,
		uint64,
		uint64 attestationId,
		bytes calldata extraData
	) external payable onlyAttestationProvider {
		(uint256 nouce, string memory name, address[] memory managers) = abi.decode(
			extraData,
			(uint256, string, address[])
		);

		_createProfile(attestationId, nouce, name, _attester, managers);
	}

	/// =========================
	/// == Internal Functions ===
	/// =========================

	function _checkOnlyProfileOwner(bytes32 _profileId) internal view {
		if (!_isOwnerOfProfile(_profileId, msg.sender)) revert UNAUTHORIZED();
	}

	function _createProfile(
		uint64 _attestationId,
		uint256 _nonce,
		string memory _name,
		address _owner,
		address[] memory _managers
	) internal returns (bytes32) {
		bytes32 profileId = _generateProfileId(_nonce, _owner);

		if (profiles[profileId].anchor != address(0)) revert NONCE_NOT_AVAILABLE();

		if (_owner == address(0)) revert ZERO_ADDRESS();

		if (credits[_owner] < 1) revert NOT_HAVE_CEDRITS();

		uint256 ownerCredits = credits[_owner];

		Profile memory profile = Profile({
			attestationId: _attestationId,
			nonce: _nonce,
			name: _name,
			credits: ownerCredits,
			owner: _owner,
			anchor: _generateAnchor(profileId, _name)
		});

		credits[_owner] -= ownerCredits;
		profiles[profileId] = profile;
		profileIds[profile.anchor] = profileId;

		bool isAuthorized = _isAuthorizedToCreateProfile(_owner);

		if (_managers.length > 0 && !isAuthorized) {
			revert UNAUTHORIZED();
		}

		authorizations[_owner] = false;

		for (uint256 i; i < _managers.length; ) {
			address manager = _managers[i];
			if (manager == address(0)) revert ZERO_ADDRESS();

			_grantRole(profileId, manager);

			unchecked {
				++i;
			}
		}

		emit ProfileCreated(
			profile.attestationId,
			profileId,
			profile.nonce,
			profile.name,
			profile.credits,
			profile.owner,
			profile.anchor
		);

		return profileId;
	}

	function _generateAnchor(
		bytes32 _profileId,
		string memory _name
	) internal returns (address anchor) {
		bytes memory encodedData = abi.encode(_profileId, _name);
		bytes memory encodedConstructorArgs = abi.encode(_profileId, address(this));

		bytes memory bytecode = abi.encodePacked(
			type(Anchor).creationCode,
			encodedConstructorArgs
		);

		bytes32 salt = keccak256(encodedData);

		address preComputedAddress = address(
			uint160(
				uint256(
					keccak256(
						abi.encodePacked(
							bytes1(0xff),
							payable(address(this)),
							salt,
							keccak256(bytecode)
						)
					)
				)
			)
		);

		// Try to deploy the anchor contract, if it fails then the anchor already exists
		try new Anchor{salt: salt}(_profileId, payable(address(this))) returns (
			Anchor _anchor
		) {
			anchor = address(_anchor);
		} catch {
			if (Anchor(payable(preComputedAddress)).profileId() != _profileId)
				revert ANCHOR_ERROR();
			anchor = preComputedAddress;
		}
	}

	function _generateProfileId(
		uint256 _nonce,
		address _owner
	) internal pure returns (bytes32) {
		return keccak256(abi.encodePacked(_nonce, _owner));
	}

	function _isAuthorizedToCreateProfile(
		address _account
	) internal view returns (bool) {
		return authorizations[_account];
	}

	function _isManagerOfProfile(
		bytes32 _profileId,
		address _manager
	) internal view returns (bool) {
		return hasRole(_profileId, _manager);
	}

	function _isOwnerOfProfile(
		bytes32 _profileId,
		address _owner
	) internal view returns (bool) {
		return profiles[_profileId].owner == _owner;
	}

	function _updateAttestationProvider(address _attestationProvider) internal {
		if (_attestationProvider == address(0)) revert ZERO_ADDRESS();

		attestationProvider = _attestationProvider;
		emit AttestationProviderUpdated(_attestationProvider);
	}

	receive() external payable {}
}
