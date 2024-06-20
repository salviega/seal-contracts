// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '../BaseCourse.sol';
import '../../core/interfaces/ICertify.sol';
import '../../core/interfaces/IRegistry.sol';

contract Course is
	BaseCourse,
	ERC721,
	ERC721Burnable,
	ERC721Enumerable,
	ERC721URIStorage
{
	/// ==========================
	/// === Storage Variables ====
	/// ==========================

	mapping(address => bool) private canMint;

	uint256 private tokenIdCounter;
	IRegistry private _registry;

	/// ====================================
	/// ========== Modifier ================
	/// ====================================

	/// ====================================
	/// ========== Constructor =============
	/// ====================================

	constructor(
		string memory _name,
		string memory _symbol,
		address _certify
	) BaseCourse(_certify) ERC721(_name, _symbol) {}

	// ====================================
	// =========== Initializer ============
	// ====================================

	function initialize(uint256 _courseId) public override onlyCertify {
		__BaseStrategy_init(_courseId);

		_registry = certify.getRegistry();

		emit Initialized(_courseId);
	}

	//  ====================================
	//  ==== External/Public Functions =====
	//  ====================================

	function authorizeToMint(address _account) external onlyCertify {
		canMint[_account] = true;

		emit AuthorizedToMint(msg.sender, _account, true);
	}

	function safeMint(
		address _to,
		string calldata _uri
	) external onlyCertify returns (uint256) {
		if (!canMint[_to]) revert CANNOT_MINT();

		uint256 tokenId = tokenIdCounter++;
		tokenIdCounter++;

		_safeMint(_to, tokenId);
		_setTokenURI(tokenId, _uri);

		canMint[_to] = false;

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
