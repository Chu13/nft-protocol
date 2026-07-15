// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ObraMarket
/// @notice Fixed-price, custodial secondary marketplace for a single ERC-721
///         collection (Obra), paid entirely in CHU. Listing escrows the NFT
///         in this contract; buying pays the seller minus the collection's
///         ERC-2981 royalty and this marketplace's configurable fee, both
///         paid out atomically in the same transaction.
/// @dev Built on OpenZeppelin v5 audited primitives only, mirroring the
///      family's Level 02 conventions: Ownable2Step, custom errors,
///      checks-effects-interactions, ReentrancyGuard on every state-changing
///      external entrypoint that moves value.
contract ObraMarket is ERC721Holder, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Denominator for both `feeBps` and any ERC-2981 royalty bps.
    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @dev Ceiling on `feeBps` — 10% — a sanity backstop against owner
    ///      misconfiguration.
    uint96 private constant MAX_FEE_BPS = 1_000;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    /// @notice The ERC-721 collection this marketplace trades. Immutable.
    IERC721 public immutable nft;

    /// @notice The ERC-20 token every listing is priced and paid in — CHU.
    IERC20 public immutable paymentToken;

    /// @notice Marketplace fee, in basis points of the sale price.
    ///         Owner-adjustable, capped at `MAX_FEE_BPS`.
    uint96 public feeBps;

    /// @notice Recipient of the marketplace fee. Owner-adjustable.
    address public feeRecipient;

    mapping(uint256 tokenId => Listing) public listings;

    /// @dev Every tokenId ever listed, used to enumerate listings in
    ///      `getListings()`. Never shrinks — `getListings()` filters to
    ///      `active` at read time. Fine at this collection's scale (capped
    ///      by `maxSupply` on Obra, a small fixed collection); a
    ///      significantly larger or unbounded collection would want a
    ///      swap-and-pop active-index instead of filtering an
    ///      ever-growing history array.
    uint256[] private _everListedTokenIds;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Bought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 royaltyAmount,
        uint256 feeAmount
    );
    event Cancelled(uint256 indexed tokenId, address indexed seller);
    event FeeUpdated(uint96 oldBps, uint96 newBps);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    error ZeroAddress();
    error ZeroPrice();
    error NotTokenOwner();
    error NotSeller();
    error ListingNotActive();
    error FeeTooHigh();

    /// @param nft_ The Obra collection address. Must be non-zero.
    /// @param paymentToken_ The CHU token address. Must be non-zero.
    /// @param initialFeeBps_ Initial marketplace fee, in basis points (<=1000).
    /// @param feeRecipient_ Initial fee recipient. Must be non-zero.
    /// @param initialOwner Address granted the Ownable2Step owner role.
    constructor(
        address nft_,
        address paymentToken_,
        uint96 initialFeeBps_,
        address feeRecipient_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (nft_ == address(0)) revert ZeroAddress();
        if (paymentToken_ == address(0)) revert ZeroAddress();
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        if (initialFeeBps_ > MAX_FEE_BPS) revert FeeTooHigh();

        nft = IERC721(nft_);
        paymentToken = IERC20(paymentToken_);
        feeBps = initialFeeBps_;
        feeRecipient = feeRecipient_;
    }

    /// @notice List `tokenId` for sale at `price` CHU. Requires the caller
    ///         to have `approve`d this contract for `tokenId` beforehand —
    ///         the NFT is pulled into escrow as part of this call.
    /// @param tokenId Token to list. Caller must currently own it.
    /// @param price Sale price, in CHU wei. Must be > 0.
    function list(uint256 tokenId, uint256 price) external nonReentrant {
        if (nft.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (price == 0) revert ZeroPrice();

        bool isNewListing = !listings[tokenId].active && listings[tokenId].seller == address(0);

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});
        if (isNewListing) {
            _everListedTokenIds.push(tokenId);
        }

        emit Listed(tokenId, msg.sender, price);

        nft.safeTransferFrom(msg.sender, address(this), tokenId);
    }

    /// @notice Buy `tokenId` at its listed price. Requires the caller to
    ///         have `approve`d this contract for at least `price` CHU
    ///         beforehand. Pays the seller minus the collection's ERC-2981
    ///         royalty and this marketplace's fee, both in the same
    ///         transaction; transfers the NFT to the caller.
    /// @param tokenId Token to buy. Must have an active listing.
    function buy(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert ListingNotActive();

        // Effects before interactions: deactivate the listing first.
        listings[tokenId].active = false;

        (uint256 royaltyAmount, address royaltyReceiver) = _royaltyFor(tokenId, listing.price);
        uint256 fee = (listing.price * feeBps) / BPS_DENOMINATOR;
        uint256 sellerProceeds = listing.price - royaltyAmount - fee;

        emit Bought(tokenId, msg.sender, listing.seller, listing.price, royaltyAmount, fee);

        if (sellerProceeds > 0) {
            paymentToken.safeTransferFrom(msg.sender, listing.seller, sellerProceeds);
        }
        if (royaltyAmount > 0) {
            paymentToken.safeTransferFrom(msg.sender, royaltyReceiver, royaltyAmount);
        }
        if (fee > 0) {
            paymentToken.safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        nft.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /// @notice Cancel an active listing and return the NFT to the seller.
    /// @param tokenId Token whose listing to cancel. Caller must be the seller.
    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listings[tokenId].active = false;

        emit Cancelled(tokenId, msg.sender);

        nft.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /// @notice Read a single listing (zero/default values if never listed).
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }

    /// @notice Enumerate every currently-active listing.
    /// @return tokenIds Token IDs with an active listing.
    /// @return activeListings The corresponding `Listing` structs, same order.
    function getListings() external view returns (uint256[] memory tokenIds, Listing[] memory activeListings) {
        uint256 total = _everListedTokenIds.length;
        uint256 activeCount = 0;
        for (uint256 i = 0; i < total; i++) {
            if (listings[_everListedTokenIds[i]].active) activeCount++;
        }

        tokenIds = new uint256[](activeCount);
        activeListings = new Listing[](activeCount);

        uint256 j = 0;
        for (uint256 i = 0; i < total; i++) {
            uint256 tokenId = _everListedTokenIds[i];
            if (listings[tokenId].active) {
                tokenIds[j] = tokenId;
                activeListings[j] = listings[tokenId];
                j++;
            }
        }
    }

    /// @notice Update the marketplace fee. Owner-only.
    /// @param newFeeBps New fee, in basis points. Must be <= 1000 (10%).
    function setFee(uint96 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    /// @notice Update the fee recipient. Owner-only.
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    /// @dev Reads the collection's ERC-2981 royalty for `tokenId`/`price` if
    ///      it supports the interface; returns (0, address(0)) otherwise so
    ///      this marketplace also works with a plain ERC-721 that has no
    ///      royalty support (defensive — Obra itself always implements it).
    function _royaltyFor(uint256 tokenId, uint256 price) private view returns (uint256 amount, address receiver) {
        if (!IERC165(address(nft)).supportsInterface(type(IERC2981).interfaceId)) {
            return (0, address(0));
        }
        (receiver, amount) = IERC2981(address(nft)).royaltyInfo(tokenId, price);
        if (receiver == address(0)) amount = 0;
    }
}
