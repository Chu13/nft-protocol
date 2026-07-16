/**
 * OBRA — generates a 1200x630 Open Graph share card per token (the piece's
 * own art + name + trait list, catalog-register) and rasterizes it to PNG
 * via @resvg/resvg-js (social crawlers don't render SVG og:image tags).
 * Reuses generateTraits/renderSvg from ./generate.ts — no second source of
 * truth for trait selection or piece rendering.
 *
 * Usage:
 *   `npm run og -- 1 3`  — generates OG cards for tokenId 1-3 only, writes
 *                           local PNGs, does NOT pin (no PINATA_JWT needed).
 *                           Use this to spot-check output before spending a
 *                           real Pinata pin on the full run.
 *   `npm run og`         — generates all 100 cards AND pins them to IPFS
 *                           (requires PINATA_JWT in contracts/.env, same as
 *                           `npm run pin`), then writes ../../exports/og.json.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { Resvg } from "@resvg/resvg-js";
import { generateTraits, renderSvg, type ObraTraits } from "./generate";

dotenv.config();

const OUT_DIR = path.join(__dirname, "output", "pin", "og");
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const ART_SIZE = 570;
const ART_MARGIN = 30;
const BG = "#000d06";
const INK = "#e9faf2";
const MUTED = "#97b2a5";
const PRIMARY = "#f5642b";

function composeOgSvg(tokenId: number, pieceSvg: string, traits: ObraTraits): string {
  const scale = ART_SIZE / 500; // renderSvg's own canvas is 500x500
  const textX = ART_SIZE + ART_MARGIN * 2;
  const traitLines = Object.entries(traits)
    .map(([trait, value], i) => {
      const y = 260 + i * 34;
      return `<text x="${textX}" y="${y}" font-family="monospace" font-size="18" fill="${MUTED}">${trait} · <tspan fill="${INK}">${value}</tspan></text>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BG}"/>
  <g transform="translate(${ART_MARGIN},${ART_MARGIN}) scale(${scale.toFixed(4)})">
    ${pieceSvg}
  </g>
  <text x="${textX}" y="180" font-family="serif" font-size="52" font-weight="600" fill="${INK}">Obra #${tokenId}</text>
  <text x="${textX}" y="220" font-family="monospace" font-size="16" letter-spacing="2" fill="${PRIMARY}">SIGNED BY CHU · PAID IN CHU</text>
  ${traitLines}
</svg>
`;
}

function generateOgPng(tokenId: number): Buffer {
  const traits = generateTraits(tokenId);
  const pieceSvg = renderSvg(tokenId, traits);
  const cardSvg = composeOgSvg(tokenId, pieceSvg, traits);
  const resvg = new Resvg(cardSvg, { fitTo: { mode: "width", value: CARD_WIDTH } });
  return resvg.render().asPng();
}

async function main() {
  const rangeArgs = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  const [start, end] = rangeArgs.length === 2 ? rangeArgs : [1, 100];
  const shouldPin = rangeArgs.length === 0; // only pin on a full, argument-less run

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Generating OG cards ${start}-${end}...`);
  for (let tokenId = start; tokenId <= end; tokenId++) {
    const png = generateOgPng(tokenId);
    fs.writeFileSync(path.join(OUT_DIR, `${tokenId}.png`), png);
  }
  console.log(`Wrote ${end - start + 1} OG card(s) to ${path.relative(process.cwd(), OUT_DIR)}`);

  if (!shouldPin) {
    console.log("Ranged run — skipped pinning. Run `npm run og` with no arguments to pin the full set.");
    return;
  }

  const { pinDirectoryToPinata } = await import("./pin");
  const ogCid = await pinDirectoryToPinata(OUT_DIR, "obra-og");
  const baseURI = `ipfs://${ogCid}/`;
  const result = { ogCid, baseURI, pinnedAt: new Date().toISOString() };

  const exportsPath = path.join(__dirname, "..", "..", "exports", "og.json");
  fs.writeFileSync(exportsPath, JSON.stringify(result, null, 2) + "\n");

  console.log(`OG cards pinned: ${baseURI}`);
  console.log(`Wrote ${path.relative(process.cwd(), exportsPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
