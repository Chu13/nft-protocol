/**
 * Smoke test: confirms app/lib/art/traits.ts's generateTraits() produces
 * byte-identical output to the canonical generator in
 * contracts/art/generate.ts, for a sample of tokenIds. Run via:
 *   npm run verify-traits
 */
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { generateTraits as portedGenerateTraits } from "../lib/art/traits";

const SAMPLE_TOKEN_IDS = [1, 50, 95];
const CONTRACTS_DIR = path.join(import.meta.dirname, "..", "..", "contracts");
const TRAIT_KEYS = ["Composición", "Paleta", "Densidad", "Acabado", "Sello"] as const;

function getCanonicalTraits(tokenIds: number[]): Record<number, Record<string, string>> {
  const script = [
    'const { generateTraits } = require("./art/generate.ts");',
    `const ids = ${JSON.stringify(tokenIds)};`,
    "const out: Record<number, Record<string, string>> = {};",
    "for (const id of ids) out[id] = generateTraits(id);",
    "console.log(JSON.stringify(out));",
  ].join("\n");

  const stdout = execFileSync("npx", ["ts-node", "-e", script], {
    cwd: CONTRACTS_DIR,
    encoding: "utf8",
  });
  // ts-node/npm may print warnings on earlier lines; the JSON payload is
  // always the last non-empty line this script prints.
  const lines = stdout.trim().split("\n").filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}

function main() {
  const canonical = getCanonicalTraits(SAMPLE_TOKEN_IDS);
  let failures = 0;

  for (const id of SAMPLE_TOKEN_IDS) {
    const ported = portedGenerateTraits(id);
    const expected = canonical[id];
    for (const key of TRAIT_KEYS) {
      if (ported[key] !== expected[key]) {
        failures++;
        console.error(`MISMATCH tokenId=${id} trait="${key}": ported="${ported[key]}" canonical="${expected[key]}"`);
      }
    }
  }

  if (failures > 0) {
    console.error(`FAIL — ${failures} trait mismatch(es) across ${SAMPLE_TOKEN_IDS.length} tokenIds.`);
    process.exit(1);
  }

  console.log(`PASS — ported generateTraits() matches the canonical generator for tokenIds ${SAMPLE_TOKEN_IDS.join(", ")}.`);
}

main();
