import { artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { DEPLOYMENTS_DIR, type DeploymentRecord } from "./lib/deployCore";

const EXPORTS_DIR = path.join(__dirname, "..", "..", "exports");

// Preference order for which deployment's collection metadata becomes the
// "canonical" values in exports/obra.json when multiple networks have been
// deployed — a deterministic tie-break, same convention as Level 02.
const NETWORK_PRIORITY = ["mainnet", "bnbMainnet", "sepolia", "bnbTestnet", "localhost", "hardhat"];

function readDeploymentRecords(): DeploymentRecord[] {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) return [];
  return fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(DEPLOYMENTS_DIR, file), "utf8")) as DeploymentRecord);
}

/**
 * Regenerates exports/obra.json and exports/market.json from:
 *   - the compiled ABI in artifacts/ (always current post-compile)
 *   - every populated contracts/deployments/<network>.json file, aggregated
 *     by chain ID
 *
 * Chain IDs with no deployment yet are simply absent from `addresses` —
 * never fabricated. Safe to re-run any time (e.g. after a new network is
 * deployed) to bring the exports up to date. Does NOT touch
 * exports/token.json — that file is CHU's, owned by the staking-protocol
 * repo and copied in here as-is.
 */
export async function exportAbis(): Promise<void> {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });

  const obraArtifact = await artifacts.readArtifact("Obra");
  const marketArtifact = await artifacts.readArtifact("ObraMarket");

  const records = readDeploymentRecords();

  const obraAddresses: Record<string, string> = {};
  const marketAddresses: Record<string, string> = {};
  for (const record of records) {
    if (record.obra?.address) obraAddresses[String(record.chainId)] = record.obra.address;
    if (record.market?.address) marketAddresses[String(record.chainId)] = record.market.address;
  }

  const canonical = [...records]
    .filter((r) => r.obra)
    .sort((a, b) => {
      const ai = NETWORK_PRIORITY.indexOf(a.network);
      const bi = NETWORK_PRIORITY.indexOf(b.network);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    })[0];

  const obraExport = {
    name: canonical?.obra.name ?? null,
    symbol: canonical?.obra.symbol ?? null,
    maxSupply: canonical?.obra.maxSupply ?? null,
    mintPrice: canonical?.obra.mintPrice ?? null,
    maxPerWallet: canonical?.obra.maxPerWallet ?? null,
    royaltyBps: canonical?.obra.royaltyBps ?? null,
    paymentToken: canonical?.paymentToken ?? null,
    addresses: obraAddresses,
    abi: obraArtifact.abi,
  };

  const marketExport = {
    name: "ObraMarket",
    feeBps: canonical?.market.feeBps ?? null,
    paymentToken: canonical?.paymentToken ?? null,
    addresses: marketAddresses,
    abi: marketArtifact.abi,
  };

  fs.writeFileSync(path.join(EXPORTS_DIR, "obra.json"), JSON.stringify(obraExport, null, 2) + "\n");
  fs.writeFileSync(path.join(EXPORTS_DIR, "market.json"), JSON.stringify(marketExport, null, 2) + "\n");

  console.log(
    `Exported ABI + addresses for ${records.length} network(s) to ${path.relative(process.cwd(), EXPORTS_DIR)}/`
  );
}

// Allow running standalone: `npx hardhat run scripts/export-abi.ts`
if (require.main === module) {
  exportAbis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
