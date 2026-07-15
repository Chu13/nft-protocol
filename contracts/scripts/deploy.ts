import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { deployProtocol, writeDeploymentRecord } from "./lib/deployCore";
import { exportAbis } from "./export-abi";

dotenv.config();

/**
 * Generic deploy script — runnable against ANY network configured in
 * hardhat.config.ts, though per the project's current scope only
 * `bnbTestnet` has been exercised:
 *
 *   npx hardhat run scripts/deploy.ts --network bnbTestnet
 *
 * Order: Obra first (needs the CHU token address for its constructor), then
 * ObraMarket (needs Obra's address), then optionally setMerkleRoot() if
 * MERKLE_ROOT is set. All values come from environment variables (see
 * .env.example) with dev-friendly fallback defaults so this also works
 * unmodified against the local `hardhat`/`localhost` network.
 *
 * The CHU payment-token address is NOT an env var — it's read from
 * ../exports/token.json (copied in from the staking-protocol repo), keyed
 * by the current network's chain ID, so it can never drift out of sync with
 * what Level 02 actually deployed.
 */

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function resolvePaymentToken(chainId: number): string {
  const tokenExportPath = path.join(__dirname, "..", "..", "exports", "token.json");
  if (!fs.existsSync(tokenExportPath)) {
    throw new Error(
      `Missing ${tokenExportPath}. Copy it from ../staking-protocol/exports/token.json before deploying.`
    );
  }
  const tokenExport = JSON.parse(fs.readFileSync(tokenExportPath, "utf8"));
  const address = tokenExport.addresses?.[String(chainId)];
  if (!address) {
    throw new Error(
      `exports/token.json has no CHU address for chain ${chainId}. Level 02 (staking-protocol) must be ` +
        "deployed to this network first."
    );
  }
  return address;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const paymentToken = resolvePaymentToken(chainId);

  const royaltyReceiver = envOrDefault("ROYALTY_RECEIVER", deployer.address);
  const marketplaceFeeRecipient = envOrDefault("MARKETPLACE_FEE_RECIPIENT", deployer.address);

  const params = {
    collectionName: envOrDefault("COLLECTION_NAME", "Obra"),
    collectionSymbol: envOrDefault("COLLECTION_SYMBOL", "OBRA"),
    paymentToken,
    maxSupply: BigInt(envOrDefault("MAX_SUPPLY", "100")),
    mintPrice: ethers.parseEther(envOrDefault("MINT_PRICE", "50")),
    maxPerWallet: BigInt(envOrDefault("MAX_PER_WALLET", "3")),
    royaltyReceiver,
    royaltyBps: BigInt(envOrDefault("ROYALTY_BPS", "500")),
    baseURI: envOrDefault("BASE_URI", "ipfs://pending/"),
    marketplaceFeeBps: BigInt(envOrDefault("MARKETPLACE_FEE_BPS", "200")),
    marketplaceFeeRecipient,
  };

  const { obra, obraAddress, marketAddress, record } = await deployProtocol(params);

  const merkleRoot = process.env.MERKLE_ROOT;
  if (merkleRoot && merkleRoot.trim().length > 0) {
    const receipt = await (await obra.connect(deployer).setMerkleRoot(merkleRoot.trim())).wait();
    console.log(`Set allowlist Merkle root to ${merkleRoot.trim()} (tx ${receipt!.hash})`);
  } else {
    console.log("MERKLE_ROOT not set — leaving the allowlist root at 0x0. Run `npm run merkle` and " +
      "call setMerkleRoot() before switching to the Allowlist phase.");
  }

  const outPath = writeDeploymentRecord(record);
  console.log(`Wrote deployment record to ${outPath}`);

  await exportAbis();

  console.log("\nDeployment complete.");
  console.log(`  Obra:       ${obraAddress}`);
  console.log(`  ObraMarket: ${marketAddress}`);
  console.log(`  CHU:        ${paymentToken}`);
  console.log(
    "\nNext steps:\n" +
      "  1. Call setPhase() to open Allowlist or Public minting (starts Closed).\n" +
      "  2. Verify on the block explorer, e.g.\n" +
      `     npx hardhat verify --network ${network.name} ${obraAddress} ` +
      `"${params.collectionName}" "${params.collectionSymbol}" ${paymentToken} ${params.maxSupply} ` +
      `${params.mintPrice} ${params.maxPerWallet} ${royaltyReceiver} ${params.royaltyBps} ` +
      `"${params.baseURI}" ${record.deployer}\n` +
      `     npx hardhat verify --network ${network.name} ${marketAddress} ` +
      `${obraAddress} ${paymentToken} ${params.marketplaceFeeBps} ${marketplaceFeeRecipient} ${record.deployer}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
