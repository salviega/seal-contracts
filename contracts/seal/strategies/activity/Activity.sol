// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '../BaseActivity.sol';
import '../../core/interfaces/ISeal.sol';
import '../../core/interfaces/IRegistry.sol';

contract Activity is
	BaseActivity,
	ERC721,
	ERC721Burnable,
	ERC721Enumerable,
	ERC721URIStorage
{
	/// ==========================
	/// === Storage Variables ====
	/// ==========================

	uint256 private tokenIdCounter;

	/// ====================================
	/// ========== Constructor =============
	/// ====================================

	constructor(
		string memory _name,
		string memory _symbol,
		address _seal
	) BaseActivity(_seal) ERC721(_name, _symbol) {}

	// ====================================
	// =========== Initializer ============
	// ====================================

	function initialize(uint256 _activityId) public override onlySeal {
		__BaseStrategy_init(_activityId);
		emit Initialized(_activityId);
	}

	//  ====================================
	//  ==== External/Public Functions =====
	//  ====================================

	function safeMint(
		address _to,
		string memory _uri
	) external onlySeal returns (uint256) {
		uint256 tokenId = ++tokenIdCounter;
		_safeMint(_to, tokenId);
		_setTokenURI(tokenId, _uri);
		return tokenId;
	}

	/// ====================================
	/// ======= Internal Functions =========
	/// ====================================

	// The following functions are overrides required by Solidity.

	function _update(
		address to,
		uint256 tokenId,
		address auth
	) internal override(ERC721, ERC721Enumerable) returns (address) {
		return super._update(to, tokenId, auth);
	}

	function _increaseBalance(
		address account,
		uint128 value
	) internal override(ERC721, ERC721Enumerable) {
		super._increaseBalance(account, value);
	}

	function tokenURI(
		uint256 tokenId
	) public view override(ERC721, ERC721URIStorage) returns (string memory) {
		return super.tokenURI(tokenId);
	}

	function supportsInterface(
		bytes4 interfaceId
	)
		public
		view
		override(ERC721, ERC721Enumerable, ERC721URIStorage)
		returns (bool)
	{
		return super.supportsInterface(interfaceId);
	}
}
