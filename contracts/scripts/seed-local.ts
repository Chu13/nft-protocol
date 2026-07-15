import { ethers, network } from "hardhat";
import { deployProtocol, writeDeploymentRecord } from "./lib/deployCore";
import { exportAbis } from "./export-abi";

/**
 * Local-only seed script. Usage:
 *
 *   # terminal 1
 *   npx hardhat node
 *
 *   # terminal 2
 *   npx hardhat run scripts/seed-local.ts --network localhost
 *
 * Unlike scripts/deploy.ts (which reads CHU's real address from
 * ../exports/token.json), this script deploys its OWN local MockERC20 as a
 * stand-in for CHU — the "31337" entry in exports/token.json refers to a
 * token deployed by a *separate* staking-protocol hardhat node process that
 * isn't running alongside this one, so reusing that address here would
 * silently point at a contract that doesn't exist on this chain.
 *
 * Deploys MockERC20 -> Obra -> ObraMarket with generous demo values, opens
 * the Public phase immediately (no allowlist friction for local frontend
 * dev), mints CHU + a couple of Obra tokens to Hardhat's well-known default
 * account #1 (distinct from the deployer/owner, account #0), and lists one
 * of them on the marketplace — so a frontend engineer has funded wallets and
 * non-empty mint/marketplace/profile pages to develop against immediately.
 *
 * Writes contracts/deployments/localhost.json and regenerates
 * exports/obra.json / exports/market.json (populating their "31337"
 * entries) exactly like scripts/deploy.ts does for live networks. Does NOT
 * touch exports/token.json.
 */

const DEV_WALLET_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const DEV_WALLET_MINT_AMOUNT = ethers.parseEther("50000");
const MINT_PRICE = ethers.parseEther("50");

async function main() {
  if (network.name !== "localhost" && network.name !== "hardhat") {
    throw new Error(
      `seed-local.ts is for local development only (got network "${network.name}"). ` +
        "Run `npx hardhat node` in one terminal, then " +
        "`npx hardhat run scripts/seed-local.ts --network localhost` in another. " +
        "For live networks use scripts/deploy.ts instead."
    );
  }

  const [deployer, devWallet] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const chu = await MockERC20.deploy("Mock CHU", "CHU");
  await chu.waitForDeployment();
  const chuAddress = await chu.getAddress();
  console.log(`Mock CHU deployed to ${chuAddress}`);

  const { obra, market, record } = await deployProtocol({
    collectionName: "Obra",
    collectionSymbol: "OBRA",
    paymentToken: chuAddress,
    maxSupply: 100n,
    mintPrice: MINT_PRICE,
    maxPerWallet: 3n,
    royaltyReceiver: deployer.address,
    royaltyBps: 500n, // 5%
    baseURI: "ipfs://pending/",
    marketplaceFeeBps: 200n, // 2%
    marketplaceFeeRecipient: deployer.address,
  });

  await (await obra.connect(deployer).setPhase(2)).wait(); // Phase.Public
  console.log("Opened Public minting phase.");

  console.log(`\nMinting ${ethers.formatEther(DEV_WALLET_MINT_AMOUNT)} CHU to dev wallet ${DEV_WALLET_ADDRESS}...`);
  await (await chu.mint(DEV_WALLET_ADDRESS, DEV_WALLET_MINT_AMOUNT)).wait();
  await (await chu.mint(deployer.address, DEV_WALLET_MINT_AMOUNT)).wait();

  // Deployer mints 3 demo tokens, then lists #1 on the marketplace so the
  // marketplace page and a seller profile aren't empty in local dev.
  await (await chu.connect(deployer).approve(await obra.getAddress(), MINT_PRICE * 3n)).wait();
  await (await obra.connect(deployer).mint(3, [])).wait();
  await (await obra.connect(deployer).approve(await market.getAddress(), 1)).wait();
  await (await market.connect(deployer).list(1, ethers.parseEther("75"))).wait();

  // Dev wallet mints one demo token of its own.
  await (await chu.connect(devWallet).approve(await obra.getAddress(), MINT_PRICE)).wait();
  await (await obra.connect(devWallet).mint(1, [])).wait();

  const outPath = writeDeploymentRecord(record);
  console.log(`Wrote deployment record to ${outPath}`);

  await exportAbis();

  console.log("\nLocal seed complete.");
  console.log(`  Mock CHU:   ${chuAddress}`);
  console.log(`  Obra:       ${record.obra.address}`);
  console.log(`  ObraMarket: ${record.market.address}`);
  console.log(`  Owner:      ${deployer.address} (Hardhat account #0) — holds tokens #2, #3; #1 listed at 75 CHU`);
  console.log(`  Dev wallet: ${DEV_WALLET_ADDRESS} (Hardhat account #1) — funded with 50,000 CHU, holds token #4`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
