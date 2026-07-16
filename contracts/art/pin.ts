/**
 * OBRA — generates all 100 pieces, pins images then metadata to IPFS via
 * Pinata, and prints the resulting baseURI.
 *
 * Requires PINATA_JWT in contracts/.env (see contracts/.env.example).
 *
 * IMPORTANT: Obra.sol does NOT append ".json" to tokenURI() — OpenZeppelin's
 * default ERC721.tokenURI() returns `baseURI + tokenId.toString()` with no
 * extension (confirmed by contracts/test/Obra.test.ts's tokenURI test).
 * Since Obra is already deployed (immutable bytecode), metadata files here
 * MUST be named exactly "1", "2", ... "100" (no extension) so
 * `ipfs://<metadataCid>/<tokenId>` resolves correctly.
 *
 * Usage: `npm run pin` (from /contracts) — writes art/output/pin/{images,metadata}/
 * and prints { imagesCid, metadataCid, baseURI } to art/output/pin/pin-result.json.
 * The printed baseURI still needs to be applied on-chain via Obra.setBaseURI()
 * — a separate owner-signed step (this script never touches a private key).
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { generateTraits, renderSvg, type ObraTraits } from "./generate";

dotenv.config();

const JWT = process.env.PINATA_JWT;
if (!JWT) {
  throw new Error("PINATA_JWT is not set. Copy contracts/.env.example to contracts/.env and add it.");
}

const TOTAL_SUPPLY = 100;
const OUT_ROOT = path.join(__dirname, "output", "pin");
const IMAGES_DIR = path.join(OUT_ROOT, "images");
const METADATA_DIR = path.join(OUT_ROOT, "metadata");

interface PinataFileResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Pins every file directly inside `dirPath` as one IPFS directory named
 * `folderName` — Pinata infers directory structure from each multipart
 * file's `filename`, which must share a common folder prefix; the response
 * `IpfsHash` is the CID of that directory, so `ipfs://<IpfsHash>/<filename>`
 * resolves each individual file.
 */
export async function pinDirectoryToPinata(dirPath: string, folderName: string): Promise<string> {
  const files = fs.readdirSync(dirPath).sort((a, b) => {
    const na = Number(a.split(".")[0]);
    const nb = Number(b.split(".")[0]);
    return na - nb;
  });

  const form = new FormData();
  for (const file of files) {
    const content = fs.readFileSync(path.join(dirPath, file));
    form.append("file", new Blob([content]), `${folderName}/${file}`);
  }
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: false }));
  form.append("pinataMetadata", JSON.stringify({ name: folderName }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload of "${folderName}" failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as PinataFileResponse;
  return json.IpfsHash;
}

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(METADATA_DIR, { recursive: true });

  console.log(`Generating ${TOTAL_SUPPLY} pieces...`);
  const traitsByToken = new Map<number, ObraTraits>();
  for (let tokenId = 1; tokenId <= TOTAL_SUPPLY; tokenId++) {
    const traits = generateTraits(tokenId);
    const svg = renderSvg(tokenId, traits);
    fs.writeFileSync(path.join(IMAGES_DIR, `${tokenId}.svg`), svg, "utf8");
    traitsByToken.set(tokenId, traits);
  }
  console.log(`Wrote ${TOTAL_SUPPLY} SVGs to ${path.relative(process.cwd(), IMAGES_DIR)}`);

  console.log("Pinning images to Pinata (this can take a minute)...");
  const imagesCid = await pinDirectoryToPinata(IMAGES_DIR, "obra-images");
  console.log(`Images pinned: ipfs://${imagesCid}/`);

  console.log("Building metadata...");
  for (let tokenId = 1; tokenId <= TOTAL_SUPPLY; tokenId++) {
    const traits = traitsByToken.get(tokenId)!;
    const metadata = {
      name: `Obra #${tokenId}`,
      description:
        "OBRA — a 100-piece generative gallery. Mint, list, and collect, all in CHU. Signed by Chu. Paid in CHU.",
      image: `ipfs://${imagesCid}/${tokenId}.svg`,
      attributes: Object.entries(traits).map(([trait_type, value]) => ({ trait_type, value })),
    };
    // No file extension — see the module-level note on Obra.sol's tokenURI() format.
    fs.writeFileSync(path.join(METADATA_DIR, `${tokenId}`), JSON.stringify(metadata, null, 2), "utf8");
  }
  console.log(`Wrote ${TOTAL_SUPPLY} metadata files to ${path.relative(process.cwd(), METADATA_DIR)}`);

  console.log("Pinning metadata to Pinata...");
  const metadataCid = await pinDirectoryToPinata(METADATA_DIR, "obra-metadata");
  const baseURI = `ipfs://${metadataCid}/`;
  console.log(`Metadata pinned: ${baseURI}`);

  const result = { imagesCid, metadataCid, baseURI, pinnedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT_ROOT, "pin-result.json"), JSON.stringify(result, null, 2) + "\n");

  console.log("\nDone.");
  console.log(`  Images CID:   ${imagesCid}`);
  console.log(`  Metadata CID: ${metadataCid}`);
  console.log(`  New baseURI:  ${baseURI}`);
  console.log("\nNext: call Obra.setBaseURI(baseURI) as the contract owner (a signed transaction — not done by this script).");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
