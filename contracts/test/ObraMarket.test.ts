import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const MAX_SUPPLY = 100n;
const MINT_PRICE = ethers.parseEther("50");
const MAX_PER_WALLET = 10n;
const ROYALTY_BPS = 500n; // 5%
const FEE_BPS = 200n; // 2%
const LIST_PRICE = ethers.parseEther("100");

enum Phase {
  Closed = 0,
  Allowlist = 1,
  Public = 2,
}

describe("ObraMarket", function () {
  async function deployMarketFixture() {
    const [owner, creator, feeRecipient, seller, buyer, outsider] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const chu = await MockERC20.deploy("Mock CHU", "CHU");

    const Obra = await ethers.getContractFactory("Obra");
    const obra = await Obra.deploy(
      "Obra",
      "OBRA",
      await chu.getAddress(),
      MAX_SUPPLY,
      MINT_PRICE,
      MAX_PER_WALLET,
      creator.address,
      ROYALTY_BPS,
      "ipfs://placeholder/",
      owner.address
    );
    await obra.connect(owner).setPhase(Phase.Public);

    const ObraMarket = await ethers.getContractFactory("ObraMarket");
    const market = await ObraMarket.deploy(
      await obra.getAddress(),
      await chu.getAddress(),
      FEE_BPS,
      feeRecipient.address,
      owner.address
    );

    // Mint token #1 to `seller`.
    await chu.mint(seller.address, ethers.parseEther("10000"));
    await chu.connect(seller).approve(await obra.getAddress(), MINT_PRICE);
    await obra.connect(seller).mint(1, []);

    // Fund the buyer with plenty of CHU.
    await chu.mint(buyer.address, ethers.parseEther("10000"));

    return { obra, chu, market, owner, creator, feeRecipient, seller, buyer, outsider };
  }

  async function listToken(obra: any, market: any, seller: any, tokenId: number, price: bigint) {
    await obra.connect(seller).approve(await market.getAddress(), tokenId);
    return market.connect(seller).list(tokenId, price);
  }

  describe("Deployment", function () {
    it("sets the NFT collection, payment token, fee, and fee recipient", async function () {
      const { obra, chu, market, feeRecipient } = await loadFixture(deployMarketFixture);
      expect(await market.nft()).to.equal(await obra.getAddress());
      expect(await market.paymentToken()).to.equal(await chu.getAddress());
      expect(await market.feeBps()).to.equal(FEE_BPS);
      expect(await market.feeRecipient()).to.equal(feeRecipient.address);
    });
  });

  describe("Listing", function () {
    it("transfers the NFT into escrow and creates an active listing", async function () {
      const { obra, market, seller } = await loadFixture(deployMarketFixture);

      await expect(listToken(obra, market, seller, 1, LIST_PRICE))
        .to.emit(market, "Listed")
        .withArgs(1, seller.address, LIST_PRICE);

      expect(await obra.ownerOf(1)).to.equal(await market.getAddress());
      const listing = await market.getListing(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(LIST_PRICE);
      expect(listing.active).to.equal(true);
    });

    it("reverts if the caller does not own the token", async function () {
      const { obra, market, seller, outsider } = await loadFixture(deployMarketFixture);
      await obra.connect(seller).approve(await market.getAddress(), 1);
      await expect(market.connect(outsider).list(1, LIST_PRICE)).to.be.revertedWithCustomError(
        market,
        "NotTokenOwner"
      );
    });

    it("reverts on a zero price listing", async function () {
      const { obra, market, seller } = await loadFixture(deployMarketFixture);
      await obra.connect(seller).approve(await market.getAddress(), 1);
      await expect(market.connect(seller).list(1, 0)).to.be.revertedWithCustomError(market, "ZeroPrice");
    });

    it("getListings() returns only active listings", async function () {
      const { obra, chu, market, seller, buyer } = await loadFixture(deployMarketFixture);
      await listToken(obra, market, seller, 1, LIST_PRICE);

      const [tokenIds, listings] = await market.getListings();
      expect(tokenIds.length).to.equal(1);
      expect(tokenIds[0]).to.equal(1);
      expect(listings[0].active).to.equal(true);

      await chu.connect(buyer).approve(await market.getAddress(), LIST_PRICE);
      await market.connect(buyer).buy(1);

      const [tokenIdsAfter] = await market.getListings();
      expect(tokenIdsAfter.length).to.equal(0);
    });
  });

  describe("Buying — approve CHU -> buy flow", function () {
    it("transfers the NFT to the buyer and pays the seller minus royalty and fee", async function () {
      const { obra, chu, market, creator, feeRecipient, seller, buyer } = await loadFixture(deployMarketFixture);
      await listToken(obra, market, seller, 1, LIST_PRICE);

      const sellerBefore = await chu.balanceOf(seller.address);
      const creatorBefore = await chu.balanceOf(creator.address);
      const feeRecipientBefore = await chu.balanceOf(feeRecipient.address);
      const buyerChuBefore = await chu.balanceOf(buyer.address);

      await chu.connect(buyer).approve(await market.getAddress(), LIST_PRICE);
      await expect(market.connect(buyer).buy(1))
        .to.emit(market, "Bought")
        .withArgs(1, buyer.address, seller.address, LIST_PRICE, ethers.parseEther("5"), ethers.parseEther("2"));

      const royalty = ethers.parseEther("5"); // 5% of 100
      const fee = ethers.parseEther("2"); // 2% of 100
      const sellerProceeds = LIST_PRICE - royalty - fee;

      expect(await obra.ownerOf(1)).to.equal(buyer.address);
      expect(await chu.balanceOf(seller.address)).to.equal(sellerBefore + sellerProceeds);
      expect(await chu.balanceOf(creator.address)).to.equal(creatorBefore + royalty);
      expect(await chu.balanceOf(feeRecipient.address)).to.equal(feeRecipientBefore + fee);
      expect(await chu.balanceOf(buyer.address)).to.equal(buyerChuBefore - LIST_PRICE);
    });

    it("reverts buy() on a listing that was already cancelled", async function () {
      const { obra, chu, market, seller, buyer } = await loadFixture(deployMarketFixture);
      await listToken(obra, market, seller, 1, LIST_PRICE);
      await market.connect(seller).cancelListing(1);

      await chu.connect(buyer).approve(await market.getAddress(), LIST_PRICE);
      await expect(market.connect(buyer).buy(1)).to.be.revertedWithCustomError(market, "ListingNotActive");
    });

    it("reverts buy() on a token that was never listed", async function () {
      const { chu, market, buyer } = await loadFixture(deployMarketFixture);
      await chu.connect(buyer).approve(await market.getAddress(), LIST_PRICE);
      await expect(market.connect(buyer).buy(1)).to.be.revertedWithCustomError(market, "ListingNotActive");
    });

    it("reverts if the buyer has not approved enough CHU", async function () {
      const { obra, market, seller, buyer } = await loadFixture(deployMarketFixture);
      await listToken(obra, market, seller, 1, LIST_PRICE);
      await expect(market.connect(buyer).buy(1)).to.be.reverted;
    });
  });

  describe("Cancelling", function () {
    it("returns the NFT to the seller and deactivates the listing", async function () {
      const { obra, market, seller } = await loadFixture(deployMarketFixture);
      await listToken(obra, market, seller, 1, LIST_PRICE);

      await expect(market.connect(seller).cancelListing(1)).to.emit(market, "Cancelled").withArgs(1, seller.address);

      expect(await obra.ownerOf(1)).to.equal(seller.address);
      const listing = await market.getListing(1);
      expect(listing.active).to.equal(false);
    });

    it("reverts if a non-seller tries to cancel", async function () {
      const { obra, market, seller, outsider } = await loadFixture(deployMarketFixture);
      await listToken(obra, market, seller, 1, LIST_PRICE);
      await expect(market.connect(outsider).cancelListing(1)).to.be.revertedWithCustomError(market, "NotSeller");
    });

    it("a cancelled listing cannot be bought", async function () {
      const { obra, chu, market, seller, buyer } = await loadFixture(deployMarketFixture);
      await listToken(obra, market, seller, 1, LIST_PRICE);
      await market.connect(seller).cancelListing(1);

      await chu.connect(buyer).approve(await market.getAddress(), LIST_PRICE);
      await expect(market.connect(buyer).buy(1)).to.be.revertedWithCustomError(market, "ListingNotActive");
    });
  });

  describe("Owner controls", function () {
    it("lets the owner update the fee, capped at a ceiling", async function () {
      const { market, owner } = await loadFixture(deployMarketFixture);
      await market.connect(owner).setFee(500);
      expect(await market.feeBps()).to.equal(500);
      await expect(market.connect(owner).setFee(1001)).to.be.revertedWithCustomError(market, "FeeTooHigh");
    });

    it("reverts when a non-owner calls setFee", async function () {
      const { market, seller } = await loadFixture(deployMarketFixture);
      await expect(market.connect(seller).setFee(100)).to.be.revertedWithCustomError(
        market,
        "OwnableUnauthorizedAccount"
      );
    });

    it("lets the owner update the fee recipient, rejecting the zero address", async function () {
      const { market, owner, buyer } = await loadFixture(deployMarketFixture);
      await expect(market.connect(owner).setFeeRecipient(buyer.address))
        .to.emit(market, "FeeRecipientUpdated")
        .withArgs(await market.feeRecipient(), buyer.address);
      expect(await market.feeRecipient()).to.equal(buyer.address);

      await expect(market.connect(owner).setFeeRecipient(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        market,
        "ZeroAddress"
      );
    });
  });
});
