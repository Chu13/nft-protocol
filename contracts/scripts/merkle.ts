import * as fs from "fs";
import * as path from "path";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

/**
 * Builds the allowlist Merkle tree for Obra's Allowlist phase.
 *
 * Input:  contracts/allowlist.json — a plain JSON array of addresses,
 *         e.g. ["0xAbc...", "0xDef..."]. Falls back to a small demo list
 *         (Hardhat's default accounts #1-#3) if the file doesn't exist, so
 *         `npm run merkle` works out of the box for local dev.
 *
 * Output: exports/allowlist.json — { root, addresses: { [address]: proof[] } },
 *         consumed directly by the frontend (no backend/indexer needed: the
 *         frontend looks up the connected wallet's proof by address and
 *         submits it with mint()). Also prints the root to stdout for
 *         pasting into MERKLE_ROOT (scripts/deploy.ts) or calling
 *         setMerkleRoot() manually post-deploy.
 *
 * Leaf encoding matches Obra.sol's verification exactly: a single-`address`
 * StandardMerkleTree leaf, i.e. keccak256(bytes.concat(keccak256(abi.encode(address)))).
 */

const ALLOWLIST_INPUT = path.join(__dirname, "..", "allowlist.json");
const EXPORTS_DIR = path.join(__dirname, "..", "..", "exports");
const OUTPUT_FILE = path.join(EXPORTS_DIR, "allowlist.json");

const DEMO_ALLOWLIST = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat default account #1
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat default account #2
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Hardhat default account #3
];

function loadAddresses(): string[] {
  if (fs.existsSync(ALLOWLIST_INPUT)) {
    const raw = JSON.parse(fs.readFileSync(ALLOWLIST_INPUT, "utf8"));
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error(`${ALLOWLIST_INPUT} must be a non-empty JSON array of addresses.`);
    }
    return raw;
  }
  console.log(`No ${path.relative(process.cwd(), ALLOWLIST_INPUT)} found — using the built-in demo allowlist.`);
  return DEMO_ALLOWLIST;
}

function main() {
  const addresses = loadAddresses();
  const tree = StandardMerkleTree.of(
    addresses.map((a) => [a]),
    ["address"]
  );

  const proofsByAddress: Record<string, string[]> = {};
  for (const [i, [address]] of tree.entries()) {
    proofsByAddress[address.toLowerCase()] = tree.getProof(i);
  }

  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ root: tree.root, addresses: proofsByAddress }, null, 2) + "\n"
  );

  console.log(`Merkle root: ${tree.root}`);
  console.log(`Wrote ${addresses.length} proof(s) to ${path.relative(process.cwd(), OUTPUT_FILE)}`);
}

main();
