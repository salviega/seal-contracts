// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/proxy/Clones.sol';

library Clone {
	function createClone(
		address _contract,
		address _attester,
		uint256 _nonce
	) internal returns (address) {
		bytes32 salt = keccak256(abi.encodePacked(_attester, _nonce));

		return Clones.cloneDeterministic(_contract, salt);
	}
}
