import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

const NAME = "Obra";
const SYMBOL = "OBRA";
const MAX_SUPPLY = 100n;
const MINT_PRICE = ethers.parseEther("50"); // 50 CHU
const MAX_PER_WALLET = 3n;
const ROYALTY_BPS = 500n; // 5%

enum Phase {
  Closed = 0,
  Allowlist = 1,
  Public = 2,
}

describe("Obra", function () {
  async function deployObraFixture() {
    const [owner, creator, alice, bob, carol, outsider] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const chu = await MockERC20.deploy("Mock CHU", "CHU");

    // Fund prospective minters generously and have them approve the collection.
    for (const signer of [alice, bob, carol]) {
      await chu.mint(signer.address, ethers.parseEther("10000"));
    }

    const Obra = await ethers.getContractFactory("Obra");
    const obra = await Obra.deploy(
      NAME,
      SYMBOL,
      await chu.getAddress(),
      MAX_SUPPLY,
      MINT_PRICE,
      MAX_PER_WALLET,
      creator.address,
      ROYALTY_BPS,
      "ipfs://placeholder/",
      owner.address
    );

    // Allowlist: alice + bob, not carol.
    const tree = StandardMerkleTree.of(
      [[alice.address], [bob.address]],
      ["address"]
    );
    await obra.connect(owner).setMerkleRoot(tree.root);

    const proofFor = (address: string) => {
      for (const [i, v] of tree.entries()) {
        if (v[0] === address) return tree.getProof(i);
      }
      return [];
    };

    return { obra, chu, owner, creator, alice, bob, carol, outsider, tree, proofFor };
  }

  async function approveAndMint(
    obra: any,
    chu: any,
    signer: any,
    quantity: bigint,
    proof: string[] = []
  ) {
    await chu.connect(signer).approve(await obra.getAddress(), MINT_PRICE * quantity);
    return obra.connect(signer).mint(quantity, proof);
  }

  describe("Deployment", function () {
    it("sets name, symbol, payment token, max supply, mint price, max per wallet", async function () {
      const { obra, chu } = await loadFixture(deployObraFixture);
      expect(await obra.name()).to.equal(NAME);
      expect(await obra.symbol()).to.equal(SYMBOL);
      expect(await obra.paymentToken()).to.equal(await chu.getAddress());
      expect(await obra.maxSupply()).to.equal(MAX_SUPPLY);
      expect(await obra.mintPrice()).to.equal(MINT_PRICE);
      expect(await obra.maxPerWallet()).to.equal(MAX_PER_WALLET);
    });

    it("starts in Closed phase", async function () {
      const { obra } = await loadFixture(deployObraFixture);
      expect(await obra.phase()).to.equal(Phase.Closed);
    });

    it("sets ERC-2981 default royalty to the creator at the configured bps", async function () {
      const { obra, creator } = await loadFixture(deployObraFixture);
      const [receiver, amount] = await obra.royaltyInfo(1, ethers.parseEther("100"));
      expect(receiver).to.equal(creator.address);
      expect(amount).to.equal(ethers.parseEther("5")); // 5% of 100
    });

    it("reverts if the payment token is the zero address", async function () {
      const [owner, creator] = await ethers.getSigners();
      const Obra = await ethers.getContractFactory("Obra");
      await expect(
        Obra.deploy(
          NAME,
          SYMBOL,
          ethers.ZeroAddress,
          MAX_SUPPLY,
          MINT_PRICE,
          MAX_PER_WALLET,
          creator.address,
          ROYALTY_BPS,
          "ipfs://placeholder/",
          owner.address
        )
      ).to.be.revertedWithCustomError(Obra, "ZeroAddress");
    });
  });

  describe("Allowlist phase minting (Merkle proof)", function () {
    it("reverts mint attempts while phase is Closed, even with a valid proof", async function () {
      const { obra, chu, owner, alice, proofFor } = await loadFixture(deployObraFixture);
      await chu.connect(alice).approve(await obra.getAddress(), MINT_PRICE);
      await expect(obra.connect(alice).mint(1, proofFor(alice.address))).to.be.revertedWithCustomError(
        obra,
        "InvalidPhase"
      );
      void owner;
    });

    it("allows an allowlisted address to mint with a valid Merkle proof", async function () {
      const { obra, chu, owner, alice, proofFor } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Allowlist);

      await approveAndMint(obra, chu, alice, 1n, proofFor(alice.address));

      expect(await obra.balanceOf(alice.address)).to.equal(1);
      expect(await obra.ownerOf(1)).to.equal(alice.address);
    });

    it("reverts an allowlist mint with an invalid Merkle proof", async function () {
      const { obra, chu, owner, carol, proofFor, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Allowlist);
      await chu.connect(carol).approve(await obra.getAddress(), MINT_PRICE);

      // carol is not on the allowlist — using alice's proof against carol's address must fail.
      await expect(obra.connect(carol).mint(1, proofFor(alice.address))).to.be.revertedWithCustomError(
        obra,
        "NotAllowlisted"
      );
    });

    it("reverts an allowlist mint from a non-allowlisted address with an empty proof", async function () {
      const { obra, chu, owner, carol } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Allowlist);
      await chu.connect(carol).approve(await obra.getAddress(), MINT_PRICE);

      await expect(obra.connect(carol).mint(1, [])).to.be.revertedWithCustomError(obra, "NotAllowlisted");
    });
  });

  describe("Public phase minting", function () {
    it("allows any address to mint in the public phase, regardless of allowlist status", async function () {
      const { obra, chu, owner, carol } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);

      await approveAndMint(obra, chu, carol, 1n);

      expect(await obra.balanceOf(carol.address)).to.equal(1);
    });

    it("mints sequential token IDs starting at 1", async function () {
      const { obra, chu, owner, alice, bob } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);

      await approveAndMint(obra, chu, alice, 1n);
      await approveAndMint(obra, chu, bob, 1n);

      expect(await obra.ownerOf(1)).to.equal(alice.address);
      expect(await obra.ownerOf(2)).to.equal(bob.address);
    });
  });

  describe("approve CHU -> mint flow", function () {
    it("pulls exactly mintPrice * quantity in CHU from the minter to the contract", async function () {
      const { obra, chu, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);

      const balanceBefore = await chu.balanceOf(alice.address);
      await approveAndMint(obra, chu, alice, 2n);

      expect(await chu.balanceOf(alice.address)).to.equal(balanceBefore - MINT_PRICE * 2n);
      expect(await chu.balanceOf(await obra.getAddress())).to.equal(MINT_PRICE * 2n);
      expect(await obra.balanceOf(alice.address)).to.equal(2);
    });

    it("reverts if the minter has not approved enough CHU", async function () {
      const { obra, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);
      // No approve() call at all.
      await expect(obra.connect(alice).mint(1, [])).to.be.reverted;
    });

    it("reverts on a zero quantity mint", async function () {
      const { obra, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);
      await expect(obra.connect(alice).mint(0, [])).to.be.revertedWithCustomError(obra, "ZeroQuantity");
    });
  });

  describe("Per-wallet limit and max supply", function () {
    it("reverts once a wallet's mints would exceed maxPerWallet", async function () {
      const { obra, chu, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);

      await approveAndMint(obra, chu, alice, MAX_PER_WALLET);
      await chu.connect(alice).approve(await obra.getAddress(), MINT_PRICE);
      await expect(obra.connect(alice).mint(1, [])).to.be.revertedWithCustomError(obra, "ExceedsWalletLimit");
    });

    it("allows minting exactly up to maxPerWallet", async function () {
      const { obra, chu, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);

      await approveAndMint(obra, chu, alice, MAX_PER_WALLET);
      expect(await obra.balanceOf(alice.address)).to.equal(MAX_PER_WALLET);
    });

    it("reverts once total supply would exceed maxSupply", async function () {
      const [owner, creator] = await ethers.getSigners();
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const chu = await MockERC20.deploy("Mock CHU", "CHU");

      const Obra = await ethers.getContractFactory("Obra");
      const smallSupply = 2n;
      const obra = await Obra.deploy(
        NAME,
        SYMBOL,
        await chu.getAddress(),
        smallSupply,
        MINT_PRICE,
        10n, // maxPerWallet high enough to not be the binding constraint
        creator.address,
        ROYALTY_BPS,
        "ipfs://placeholder/",
        owner.address
      );
      await obra.connect(owner).setPhase(Phase.Public);

      const signers = await ethers.getSigners();
      const minters = [signers[3], signers[4], signers[5]];
      for (const m of minters) await chu.mint(m.address, ethers.parseEther("1000"));

      await approveAndMint(obra, chu, minters[0], 1n);
      await approveAndMint(obra, chu, minters[1], 1n);

      await chu.connect(minters[2]).approve(await obra.getAddress(), MINT_PRICE);
      await expect(obra.connect(minters[2]).mint(1, [])).to.be.revertedWithCustomError(obra, "ExceedsMaxSupply");
    });
  });

  describe("Royalties (ERC-2981)", function () {
    it("reports the configured royalty on every token, and Obra advertises ERC-2981 support", async function () {
      const { obra, creator } = await loadFixture(deployObraFixture);
      expect(await obra.supportsInterface("0x2a55205a")).to.equal(true); // IERC2981 interfaceId
      const [receiver, amount] = await obra.royaltyInfo(42, ethers.parseEther("200"));
      expect(receiver).to.equal(creator.address);
      expect(amount).to.equal(ethers.parseEther("10")); // 5% of 200
    });

    it("allows the owner to update the royalty receiver and bps", async function () {
      const { obra, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setRoyaltyInfo(alice.address, 1000); // 10%
      const [receiver, amount] = await obra.royaltyInfo(1, ethers.parseEther("100"));
      expect(receiver).to.equal(alice.address);
      expect(amount).to.equal(ethers.parseEther("10"));
    });

    it("reverts royalty bps above the configured ceiling", async function () {
      const { obra, owner, alice } = await loadFixture(deployObraFixture);
      await expect(obra.connect(owner).setRoyaltyInfo(alice.address, 5001)).to.be.revertedWithCustomError(
        obra,
        "RoyaltyTooHigh"
      );
    });
  });

  describe("Owner controls", function () {
    it("lets the owner change phases and emits PhaseChanged", async function () {
      const { obra, owner } = await loadFixture(deployObraFixture);
      await expect(obra.connect(owner).setPhase(Phase.Allowlist))
        .to.emit(obra, "PhaseChanged")
        .withArgs(Phase.Closed, Phase.Allowlist);
      expect(await obra.phase()).to.equal(Phase.Allowlist);
    });

    it("reverts when a non-owner calls setPhase", async function () {
      const { obra, alice } = await loadFixture(deployObraFixture);
      await expect(obra.connect(alice).setPhase(Phase.Public)).to.be.revertedWithCustomError(
        obra,
        "OwnableUnauthorizedAccount"
      );
    });

    it("lets the owner pause and unpause minting", async function () {
      const { obra, chu, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);
      await obra.connect(owner).pause();

      await chu.connect(alice).approve(await obra.getAddress(), MINT_PRICE);
      await expect(obra.connect(alice).mint(1, [])).to.be.revertedWithCustomError(obra, "EnforcedPause");

      await obra.connect(owner).unpause();
      await obra.connect(alice).mint(1, []);
      expect(await obra.balanceOf(alice.address)).to.equal(1);
    });

    it("lets the owner withdraw accumulated CHU to a chosen address", async function () {
      const { obra, chu, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);
      await approveAndMint(obra, chu, alice, 1n);

      const contractBalance = await chu.balanceOf(await obra.getAddress());
      expect(contractBalance).to.equal(MINT_PRICE);

      await obra.connect(owner).withdraw(owner.address);
      expect(await chu.balanceOf(owner.address)).to.equal(contractBalance);
      expect(await chu.balanceOf(await obra.getAddress())).to.equal(0);
    });

    it("reverts withdraw when called by a non-owner", async function () {
      const { obra, alice } = await loadFixture(deployObraFixture);
      await expect(obra.connect(alice).withdraw(alice.address)).to.be.revertedWithCustomError(
        obra,
        "OwnableUnauthorizedAccount"
      );
    });

    it("lets the owner update mint price, max per wallet, and base URI", async function () {
      const { obra, chu, owner, alice } = await loadFixture(deployObraFixture);
      await obra.connect(owner).setPhase(Phase.Public);

      await expect(obra.connect(owner).setMintPrice(ethers.parseEther("75")))
        .to.emit(obra, "MintPriceUpdated")
        .withArgs(MINT_PRICE, ethers.parseEther("75"));
      expect(await obra.mintPrice()).to.equal(ethers.parseEther("75"));

      await expect(obra.connect(owner).setMaxPerWallet(1))
        .to.emit(obra, "MaxPerWalletUpdated")
        .withArgs(MAX_PER_WALLET, 1);
      expect(await obra.maxPerWallet()).to.equal(1);

      await expect(obra.connect(owner).setBaseURI("ipfs://newcid/"))
        .to.emit(obra, "BaseURIUpdated")
        .withArgs("ipfs://newcid/");

      await chu.connect(alice).approve(await obra.getAddress(), ethers.parseEther("75"));
      await obra.connect(alice).mint(1, []);
      expect(await obra.tokenURI(1)).to.equal("ipfs://newcid/1");
    });
  });
});
