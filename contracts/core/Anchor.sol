// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol';
import './Registry.sol';

contract Anchor is ERC721HolderUpgradeable, ERC1155HolderUpgradeable {
	Registry public immutable registry;
	bytes32 public immutable profileId;

	error UNAUTHORIZED();
	error CALL_FAILED();

	constructor(bytes32 _profileId, address _registry) {
		registry = Registry(_registry);
		profileId = _profileId;
	}

	function execute(
		address _target,
		uint256 _value,
		bytes memory _data
	) external returns (bytes memory) {
		if (!registry.isOwnerOfProfile(profileId, msg.sender))
			revert UNAUTHORIZED();

		if (_target == address(0)) revert CALL_FAILED();

		(bool success, bytes memory data) = _target.call{value: _value}(_data);

		if (!success) revert CALL_FAILED();

		return data;
	}

	receive() external payable {}
}
