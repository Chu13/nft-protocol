// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Obra
/// @notice ERC-721 collection for the OBRA gallery (Level 03) — supply-limited,
///         two-phase minted (Merkle allowlist -> public), paid entirely in
///         CHU (Level 02's ERC-20 token, supplied at construction), with
///         ERC-2981 creator royalties enforced by the sibling ObraMarket
///         contract on every secondary sale.
/// @dev Built on OpenZeppelin v5 audited primitives only, mirroring the
///      family's Level 02 conventions: Ownable2Step (never a one-step
///      transferOwnership that can orphan control), custom errors, checks
///      before interactions, ERC721Enumerable so a collector's-profile
///      frontend can list an address's tokens with zero backend/indexer.
contract Obra is ERC721, ERC721Enumerable, ERC2981, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Minting proceeds through two gated phases before falling
    ///         fully open, matching the project spec:
    ///         Closed (no minting) -> Allowlist (Merkle proof required) ->
    ///         Public (anyone may mint).
    enum Phase {
        Closed,
        Allowlist,
        Public
    }

    /// @dev Ceiling on `royaltyBps` a single sale can carry — 50% — a
    ///      sanity backstop against owner misconfiguration, not a claim
    ///      that any real royalty should approach it.
    uint96 private constant MAX_ROYALTY_BPS = 5_000;

    /// @notice The ERC-20 token every mint is paid in — CHU, from Level 02.
    ///         Immutable: no post-deploy currency swap.
    IERC20 public immutable paymentToken;

    /// @notice Hard ceiling on total tokens ever minted.
    uint256 public immutable maxSupply;

    /// @notice Price of one mint, in `paymentToken` wei. Owner-adjustable.
    uint256 public mintPrice;

    /// @notice Maximum tokens a single wallet may mint across all phases
    ///         combined. Owner-adjustable.
    uint256 public maxPerWallet;

    /// @notice Current minting phase. Starts Closed at deploy.
    Phase public phase;

    /// @notice Merkle root of the allowlist (leaf = keccak256(bytes.concat(
    ///         keccak256(abi.encode(address)))), matching OpenZeppelin's
    ///         `merkle-tree` package's StandardMerkleTree for a
    ///         single-`address` leaf). Unset (bytes32(0)) disables allowlist
    ///         minting even if `phase == Allowlist`.
    bytes32 public merkleRoot;

    /// @notice Tokens minted so far by each wallet, across all phases.
    mapping(address account => uint256 minted) public mintedByWallet;

    string private _baseTokenURI;
    uint256 private _nextTokenId;

    event PhaseChanged(Phase oldPhase, Phase newPhase);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event MaxPerWalletUpdated(uint256 oldMax, uint256 newMax);
    event MerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot);
    event BaseURIUpdated(string newBaseURI);
    event RoyaltyUpdated(address indexed receiver, uint96 bps);
    event Minted(address indexed minter, uint256 startTokenId, uint256 quantity, uint256 totalPaid);
    event Withdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroQuantity();
    error InvalidPhase();
    error NotAllowlisted();
    error ExceedsMaxSupply(uint256 requested, uint256 remaining);
    error ExceedsWalletLimit(uint256 requested, uint256 remaining);
    error RoyaltyTooHigh();
    error InvalidMaxSupply();

    /// @param name_ ERC-721 name.
    /// @param symbol_ ERC-721 symbol.
    /// @param paymentToken_ The CHU token address. Must be non-zero.
    /// @param maxSupply_ Hard cap on total mints. Must be non-zero.
    /// @param mintPrice_ Price per mint, in `paymentToken_` wei.
    /// @param maxPerWallet_ Per-wallet mint ceiling, across all phases.
    /// @param royaltyReceiver_ ERC-2981 default royalty recipient (the creator).
    /// @param royaltyBps_ ERC-2981 default royalty, in basis points (<=5000).
    /// @param baseURI_ Initial metadata base URI (e.g. an `ipfs://<cid>/`).
    /// @param initialOwner Address granted the Ownable2Step owner role.
    constructor(
        string memory name_,
        string memory symbol_,
        address paymentToken_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_,
        address royaltyReceiver_,
        uint96 royaltyBps_,
        string memory baseURI_,
        address initialOwner
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        if (paymentToken_ == address(0)) revert ZeroAddress();
        if (royaltyReceiver_ == address(0)) revert ZeroAddress();
        if (maxSupply_ == 0) revert InvalidMaxSupply();
        if (royaltyBps_ > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();

        paymentToken = IERC20(paymentToken_);
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        maxPerWallet = maxPerWallet_;
        _baseTokenURI = baseURI_;
        _nextTokenId = 1;

        _setDefaultRoyalty(royaltyReceiver_, royaltyBps_);
    }

    /// @notice Mint `quantity` tokens to the caller, paying
    ///         `mintPrice * quantity` in CHU (requires a prior `approve`).
    /// @dev Reverts while `phase == Closed`. During `Allowlist`, requires a
    ///      valid Merkle `proof` for `msg.sender`; `proof` is ignored during
    ///      `Public`. Effects (wallet/supply bookkeeping, minting) happen
    ///      before the CHU pull, but CHU is pulled before the loop mints any
    ///      token — see inline ordering notes.
    /// @param quantity Number of tokens to mint. Must be > 0.
    /// @param proof Merkle proof of `msg.sender`'s allowlist membership.
    ///        Ignored outside the Allowlist phase.
    function mint(uint256 quantity, bytes32[] calldata proof) external whenNotPaused {
        if (quantity == 0) revert ZeroQuantity();

        Phase currentPhase = phase;
        if (currentPhase == Phase.Closed) revert InvalidPhase();

        if (currentPhase == Phase.Allowlist) {
            bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
            if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert NotAllowlisted();
        }

        uint256 minted = mintedByWallet[msg.sender];
        if (minted + quantity > maxPerWallet) {
            revert ExceedsWalletLimit(quantity, maxPerWallet - minted);
        }

        uint256 minted_ = totalSupply();
        if (minted_ + quantity > maxSupply) {
            revert ExceedsMaxSupply(quantity, maxSupply - minted_);
        }

        uint256 totalPrice = mintPrice * quantity;
        mintedByWallet[msg.sender] = minted + quantity;

        uint256 startTokenId = _nextTokenId;
        emit Minted(msg.sender, startTokenId, quantity, totalPrice);

        // Interaction (pull payment) before the mint loop's external-facing
        // _safeMint calls (which invoke onERC721Received on contract
        // recipients) — checks-effects-interactions with the CHU pull as
        // the first interaction.
        if (totalPrice > 0) {
            paymentToken.safeTransferFrom(msg.sender, address(this), totalPrice);
        }

        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, _nextTokenId);
            _nextTokenId++;
        }
    }

    /// @notice Advance or roll back the minting phase. Owner-only.
    function setPhase(Phase newPhase) external onlyOwner {
        emit PhaseChanged(phase, newPhase);
        phase = newPhase;
    }

    /// @notice Pause minting (transfers are unaffected). Owner-only.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause minting. Owner-only.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Update the allowlist Merkle root. Owner-only.
    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        emit MerkleRootUpdated(merkleRoot, newRoot);
        merkleRoot = newRoot;
    }

    /// @notice Update the mint price. Owner-only.
    function setMintPrice(uint256 newPrice) external onlyOwner {
        emit MintPriceUpdated(mintPrice, newPrice);
        mintPrice = newPrice;
    }

    /// @notice Update the per-wallet mint ceiling. Owner-only.
    function setMaxPerWallet(uint256 newMax) external onlyOwner {
        emit MaxPerWalletUpdated(maxPerWallet, newMax);
        maxPerWallet = newMax;
    }

    /// @notice Update the metadata base URI. Owner-only.
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /// @notice Update the ERC-2981 default royalty receiver/bps. Owner-only.
    /// @param receiver New royalty recipient. Must be non-zero.
    /// @param bps New royalty, in basis points. Must be <= 5000 (50%).
    function setRoyaltyInfo(address receiver, uint96 bps) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        if (bps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();
        _setDefaultRoyalty(receiver, bps);
        emit RoyaltyUpdated(receiver, bps);
    }

    /// @notice Withdraw the full CHU balance accumulated from mints to `to`.
    ///         Owner-only.
    /// @param to Recipient of the withdrawn CHU. Must be non-zero.
    function withdraw(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = paymentToken.balanceOf(address(this));
        emit Withdrawn(to, balance);
        if (balance > 0) {
            paymentToken.safeTransfer(to, balance);
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @dev Required override: ERC721 and ERC721Enumerable both define `_update`.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    /// @dev Required override: ERC721 and ERC721Enumerable both define `_increaseBalance`.
    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, amount);
    }

    /// @dev Required override: ERC721, ERC721Enumerable, and ERC2981 all define `supportsInterface`.
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
