# OBRA

> Level 03 of a 3-project DeFi portfolio ecosystem — mint, list, and collect a 100-piece generative NFT gallery, paid entirely in CHU (Level 02's token). Signed by Chu. Paid in CHU.

**Live demo**: _pending Vercel deploy_
**Contracts**: verified live on BNB Chain Testnet — see [Deployed contracts](#deployed-contracts) below.

## What is this

An NFT ecosystem in three parts, each a section of the app:

- **Mint** (`/`) — mint one of 100 generative pieces, approve → mint in two clearly-signposted steps, paid in CHU.
- **Marketplace** (`/marketplace`) — every piece currently listed for sale, sortable by price, buy in two steps (approve → acquire).
- **Profile** (`/profile/[address]`) — any wallet's collection, read-only for anyone, with list/cancel actions when it's your own.

No backend anywhere — the contracts are the source of truth for state, and NFT art/metadata is pinned to IPFS. See [`prompt-proyecto-nft-dapp.md`](./prompt-proyecto-nft-dapp.md) for the full original spec and [`brand/BRAND.md`](./brand/BRAND.md) for the complete visual identity system ("The Night Gallery").

## Screenshots

<!-- TODO: add screenshots/GIF of the mint page, marketplace, and a profile page.
     The app is live and fully working (see Deployed contracts below) — screenshots
     were verified visually during development but not yet committed as image files.
     Capture at localhost:3000 (or the Vercel demo) showing: the mint panel with the
     Public-phase stats, the marketplace grid with a real listing, and a profile page
     with an owned + listed piece. -->

## Ecosystem context

This project spends the ERC-20 token deployed in **Level 02 (CHU Protocol / ERC-20 Staking Protocol)** — CHU is not re-deployed here, it's imported directly by address. Every payment in OBRA (minting, buying, listing) is denominated in CHU, not ETH/BNB. If a wallet has no CHU, both the mint page and profile page link out to Level 02's staking dashboard to get some (no lockup).

- Level 02 repo: [`../staking-protocol`](../staking-protocol)
- Level 02 live demo: https://staking-protocol-chu.vercel.app

## Supported networks

- **BNB Chain Testnet** — deployed and live (this iteration's only deploy target).
- Ethereum (Sepolia/mainnet) and BNB Chain mainnet — structurally wired (same `NEXT_PUBLIC_NETWORK_ENV` pattern as Level 02) but not deployed yet; out of scope for this pass.

## Deployed contracts

All three contracts are live on **BNB Chain Testnet** (chainId `97`):

| Contract | Address | Explorer |
|---|---|---|
| CHU (ERC-20, from Level 02) | `0x4f23351272080eA5e14FA7F846E6876A6b5EF78e` | [BscScan](https://testnet.bscscan.com/address/0x4f23351272080eA5e14FA7F846E6876A6b5EF78e) |
| Obra (ERC-721 collection) | `0x8D04CBE070430F92E7Ca824c67B688C5B7693077` | [BscScan](https://testnet.bscscan.com/address/0x8D04CBE070430F92E7Ca824c67B688C5B7693077) |
| ObraMarket (marketplace) | `0x01422CC3683108D9373b53f0d589F3F34fb27370` | [BscScan](https://testnet.bscscan.com/address/0x01422CC3683108D9373b53f0d589F3F34fb27370) |

Collection parameters: 100 max supply, 50 CHU mint price, 3 mints per wallet, 5% creator royalty (ERC-2981), 2% marketplace fee. Full deployment record (tx hashes, block numbers): [`contracts/deployments/bnbTestnet.json`](./contracts/deployments/bnbTestnet.json).

Art + metadata are pinned to IPFS via Pinata:
- Images: `ipfs://bafybeicb4f6msted53kj6t4gtg4kle2aeze46t7e2rle2uhwsdh6i2pnjy/`
- Metadata (the contract's `baseURI`): `ipfs://bafybeihtbnfsy5vdonrtr4by6mrvvpcexi5ibnoopxogpqnzbs53vl4wju/`

Both contracts were deployed and administered entirely from a browser wallet (MetaMask) — no deployer private key is stored anywhere in this repo.

## Stack

- **Contracts**: Solidity 0.8.28, Hardhat, TypeScript, OpenZeppelin Contracts v5, `@openzeppelin/merkle-tree`
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, wagmi, viem, RainbowKit, TanStack Query
- **Art**: a zero-dependency deterministic SVG generator (seeded PRNG, no images fetched/uploaded — pure code) — see [`contracts/art/`](./contracts/art/)
- **Storage**: IPFS via Pinata (images + metadata) — no backend, no database

## Repo structure

```
/contracts — Obra + ObraMarket contracts, tests, deploy/seed/merkle/pin scripts, the art generator
/app       — mint page, marketplace, collector profile
/brand     — visual identity system (BRAND.md, logo/favicon/OG assets, palette.json)
/exports   — token/Obra/ObraMarket ABI + per-network addresses (single source of truth for the frontend)
```

## Running the tests

```bash
cd contracts
npm install
npx hardhat test
```

40 tests covering: allowlist minting with valid/invalid Merkle proofs, public-phase minting, the full approve-CHU → mint flow (balance verification), per-wallet and max-supply limits, ERC-2981 royalty configuration and payout, listing/buying/cancelling on the marketplace, royalty + fee deduction on sale, owner-only access control, and pause/withdraw admin functions.

```bash
npx hardhat coverage
```

## Running the frontend locally

**Against BNB Chain Testnet (the real deployed contracts):**

```bash
cd app
npm install
echo "NEXT_PUBLIC_NETWORK_ENV=testnet" > .env.local
npm run dev
```

**Against a local Hardhat chain** (deploys a mock CHU token + Obra + ObraMarket locally, seeds demo listings):

```bash
# terminal 1
cd contracts
npm install
npx hardhat node

# terminal 2
cd contracts
npx hardhat run scripts/seed-local.ts --network localhost

# terminal 3
cd app
echo "NEXT_PUBLIC_NETWORK_ENV=local" > .env.local
npm install
npm run dev
```

## Environment variables

**Contracts** (`contracts/.env`, see [`contracts/.env.example`](./contracts/.env.example)):

| Variable | Purpose |
|---|---|
| `BNB_TESTNET_RPC_URL` | RPC endpoint for BNB Chain Testnet (reused from Level 02) |
| `PINATA_JWT` | Pinata API JWT, used only by `npm run pin` (art/metadata upload) |
| `DEPLOYER_PRIVATE_KEY` | Optional — only needed for `hardhat run scripts/deploy.ts` (a private-key deploy path). The actual BNB Testnet deployment above was done via a browser wallet instead; this repo holds no deployer key. |
| `COLLECTION_NAME`, `COLLECTION_SYMBOL`, `MAX_SUPPLY`, `MINT_PRICE`, `MAX_PER_WALLET`, `ROYALTY_RECEIVER`, `ROYALTY_BPS`, `BASE_URI`, `MARKETPLACE_FEE_BPS`, `MARKETPLACE_FEE_RECIPIENT`, `MERKLE_ROOT` | Deploy-time parameters for `scripts/deploy.ts`, all with sensible defaults matching the live deployment |

**Frontend** (`app/.env.local`, see [`app/.env.example`](./app/.env.example)):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_NETWORK_ENV` | `local` \| `testnet` \| `mainnet` — the only switch needed to move the whole app between chain sets |
| `NEXT_PUBLIC_BNB_TESTNET_RPC_URL` | Optional custom RPC (falls back to the public default) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional — enables the WalletConnect QR connector; injected wallets (MetaMask etc.) work without it |
| `NEXT_PUBLIC_IPFS_GATEWAY` | Optional custom IPFS gateway (falls back to Pinata's public gateway) |
| `NEXT_PUBLIC_SITE_URL` | Used for social-share (OG) image resolution |

## Out of scope (per spec)

Auctions/dynamic pricing, buyer offers on unlisted pieces, networks beyond Ethereum + BNB Chain, a post-mint reveal mechanic, and an admin UI panel.
