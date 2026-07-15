/**
 * OBRA — deterministic collection art generator.
 *
 * Given a tokenId (1-100), picks weighted traits from ./traits.json and renders a pure
 * code-generated SVG "gallery plate": a dark viridian mat, a thin frame line, a geometric
 * composition drawn per the Composición trait (palette per Paleta, shape count per Densidad,
 * texture per Acabado), and the OBRA seal stamped in the lower-right corner per Sello.
 *
 * Zero runtime dependencies — a tiny inline mulberry32 PRNG seeded deterministically per
 * tokenId, so re-running this script is idempotent (same tokenId always renders the same SVG).
 *
 * Two independent seeded RNG streams per token — one for trait selection, one for shape
 * placement — so future edits to traits.json never shift how already-picked traits render.
 *
 * Usage: `ts-node generate.ts` (or `node generate.ts` on Node >=22 with native TS support)
 * writes art/output/{id}.svg for tokenId 1-100.
 *
 * `generateTraits` and `renderSvg` are exported so a later metadata-generation script
 * (e.g. one that builds ERC-721 JSON + uploads to IPFS) can import them directly instead of
 * re-implementing trait selection or rendering.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Deterministic PRNG — FNV-1a string hash (seed) + mulberry32 (stream)
// ---------------------------------------------------------------------------

function fnv1aHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

function pickOne<T>(rng: () => number, arr: T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Trait model — loaded from ./traits.json (single source of truth, shared
// with the frontend's trait-display UI)
// ---------------------------------------------------------------------------

interface TraitValue {
  value: string;
  weight: number;
}

interface TraitDef {
  trait_type: string;
  values: TraitValue[];
}

export interface ObraTraits {
  Composición: string;
  Paleta: string;
  Densidad: string;
  Acabado: string;
  Sello: string;
}

const TRAITS_PATH = path.join(__dirname, "traits.json");
const traitDefs: TraitDef[] = JSON.parse(fs.readFileSync(TRAITS_PATH, "utf8"));

function weightedPick(rng: () => number, values: TraitValue[]): string {
  const total = values.reduce((sum, v) => sum + v.weight, 0);
  let r = rng() * total;
  for (const v of values) {
    if (r < v.weight) return v.value;
    r -= v.weight;
  }
  return values[values.length - 1].value;
}

/**
 * Deterministically picks all 5 OBRA traits for a tokenId. Pure function of tokenId —
 * same tokenId always returns the same traits, independent of render-time RNG usage.
 */
export function generateTraits(tokenId: number): ObraTraits {
  const rng = mulberry32(fnv1aHash(`obra-traits:${tokenId}`));
  const picked: Record<string, string> = {};
  for (const def of traitDefs) {
    picked[def.trait_type] = weightedPick(rng, def.values);
  }
  return picked as unknown as ObraTraits;
}

// ---------------------------------------------------------------------------
// Brand palette (computed hex — see /brand/BRAND.md §3 and /brand/assets/palette.json,
// source of truth for these values)
// ---------------------------------------------------------------------------

const COLOR = {
  bg: "#000d06",
  surface: "#011c11",
  surfaceHigh: "#0a2b1e",
  border: "#203c30",
  ink: "#e9faf2",
  muted: "#97b2a5",
  primary: "#f5642b",
  primaryDeep: "#c06240",
  secondary: "#57bc80",
  secondaryDeep: "#438c60",
  // extended art-only palette (collection generator, not core UI tokens)
  bone: "#ded6c9",
  gold: "#ddb049",
  goldDeep: "#9e7a23",
} as const;

// Inner frame bounds — the area the composition is clipped to.
const FRAME = { x: 46, y: 46, size: 408 };

function paletteColors(paleta: string): string[] {
  switch (paleta) {
    case "Sala Verde":
      return [COLOR.secondary, COLOR.secondaryDeep, COLOR.ink];
    case "Vermellón":
      return [COLOR.primary, COLOR.primaryDeep, COLOR.ink];
    case "Hueso y Tinta":
      return [COLOR.bone, COLOR.ink, COLOR.muted];
    case "Dorada":
      return [COLOR.gold, COLOR.goldDeep, COLOR.ink];
    case "Espectro":
      return [COLOR.primary, COLOR.secondary, COLOR.gold, COLOR.bone, COLOR.ink];
    default:
      return [COLOR.secondary, COLOR.secondaryDeep, COLOR.ink];
  }
}

/** Shape count for a composición, drawn from the Densidad trait's stated range. */
function densityCount(densidad: string, rng: () => number): number {
  switch (densidad) {
    case "Mínima":
      return randInt(rng, 1, 3);
    case "Equilibrada":
      return randInt(rng, 4, 7);
    case "Densa":
      return randInt(rng, 8, 12);
    default:
      return randInt(rng, 4, 7);
  }
}

// ---------------------------------------------------------------------------
// The seal — vermilion (or gold) rounded-square chop enclosing a continuous
// stroke that abstracts an "O" with a signature-flourish tail.
// Path data is the canonical mark, shared with /brand/assets/seal.svg — if
// that file's `d` attribute ever changes, mirror the change here too.
// ---------------------------------------------------------------------------

const SEAL_SQUARE = { x: 8, y: 8, width: 84, height: 84, rx: 14 };
const SEAL_RING_TAIL_D =
  "M 62.55 57.22 A 19 19 0 1 1 66.93 46.66 C 76 52 82 62 78 72 C 75.5 78 68 80 62 76";

function sealMark(fill: string, ringColor: string): string {
  return `<rect x="${SEAL_SQUARE.x}" y="${SEAL_SQUARE.y}" width="${SEAL_SQUARE.width}" height="${SEAL_SQUARE.height}" rx="${SEAL_SQUARE.rx}" fill="${fill}"/><path d="${SEAL_RING_TAIL_D}" fill="none" stroke="${ringColor}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderSeal(sello: string, x: number, y: number, size: number): string {
  const scale = (size / 100).toFixed(4);
  if (sello === "Double") {
    // Two overlapping stamps, offset and counter-rotated — "signed twice."
    const s = size * 0.62;
    const scale2 = (s / 100).toFixed(4);
    return `<g>
      <g transform="translate(${x - 12},${y - 8}) rotate(-8) scale(${scale2})">${sealMark(COLOR.primary, COLOR.bg)}</g>
      <g transform="translate(${x + 10},${y + 6}) rotate(6) scale(${scale2})">${sealMark(COLOR.gold, COLOR.bg)}</g>
    </g>`;
  }
  const fill = sello === "Gold" ? COLOR.gold : COLOR.primary;
  return `<g transform="translate(${x},${y}) scale(${scale})">${sealMark(fill, COLOR.bg)}</g>`;
}

// ---------------------------------------------------------------------------
// Composición renderers — pure code-generated shapes (rects/circles/paths).
// Each takes the inner frame bounds, a seeded RNG, and returns an SVG fragment.
// ---------------------------------------------------------------------------

function renderOrbital(colors: string[], count: number, rng: () => number): string {
  const parts: string[] = [];
  const cx0 = FRAME.x + FRAME.size / 2;
  const cy0 = FRAME.y + FRAME.size / 2;
  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    const r = randRange(rng, 24, 100);
    const cx = randRange(rng, FRAME.x + r * 0.3, FRAME.x + FRAME.size - r * 0.3);
    const cy = randRange(rng, FRAME.y + r * 0.3, FRAME.y + FRAME.size - r * 0.3);
    const opacity = randRange(rng, 0.55, 1);
    if (i % 3 === 2) {
      // stroked arc ring instead of a filled disc, for rhythm
      parts.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${randRange(rng, 3, 8).toFixed(1)}" opacity="${opacity.toFixed(2)}"/>`
      );
    } else {
      parts.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`
      );
    }
  }
  // faint reference to the shared center, ties the composition together
  parts.push(
    `<circle cx="${cx0}" cy="${cy0}" r="3" fill="${COLOR.ink}" opacity="0.5"/>`
  );
  return parts.join("");
}

function renderConstructiva(colors: string[], count: number, rng: () => number): string {
  const angles = [0, 15, 30, 45, -15, -30, -45];
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    const w = randRange(rng, 140, 320);
    const h = randRange(rng, 10, 28);
    const x = randRange(rng, FRAME.x - 20, FRAME.x + FRAME.size - w + 20);
    const y = randRange(rng, FRAME.y, FRAME.y + FRAME.size - h);
    const angle = pickOne(rng, angles);
    const pivotX = x + w / 2;
    const pivotY = y + h / 2;
    const opacity = randRange(rng, 0.7, 1);
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" transform="rotate(${angle} ${pivotX.toFixed(1)} ${pivotY.toFixed(1)})"/>`
    );
  }
  return parts.join("");
}

function renderReticula(colors: string[], count: number, rng: () => number): string {
  const gridN = 6;
  const cell = FRAME.size / gridN;
  const filledCells = Math.min(gridN * gridN, Math.max(count * 2, 6));
  const seen = new Set<number>();
  const parts: string[] = [];
  let attempts = 0;
  while (seen.size < filledCells && attempts < filledCells * 8) {
    attempts++;
    const idx = randInt(rng, 0, gridN * gridN - 1);
    if (seen.has(idx)) continue;
    seen.add(idx);
    const gx = idx % gridN;
    const gy = Math.floor(idx / gridN);
    const pad = randRange(rng, 2, 8);
    const x = FRAME.x + gx * cell + pad / 2;
    const y = FRAME.y + gy * cell + pad / 2;
    const size = cell - pad;
    const color = colors[idx % colors.length];
    const opacity = randRange(rng, 0.65, 1);
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`
    );
  }
  return parts.join("");
}

function renderTrazo(colors: string[], count: number, rng: () => number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    const startX = randRange(rng, FRAME.x, FRAME.x + FRAME.size * 0.3);
    const startY = randRange(rng, FRAME.y, FRAME.y + FRAME.size);
    let d = `M ${startX.toFixed(1)} ${startY.toFixed(1)}`;
    let cx = startX;
    let cy = startY;
    const segments = randInt(rng, 2, 4);
    for (let s = 0; s < segments; s++) {
      const c1x = cx + randRange(rng, 20, FRAME.size * 0.3);
      const c1y = cy + randRange(rng, -80, 80);
      const c2x = c1x + randRange(rng, 20, FRAME.size * 0.3);
      const c2y = c1y + randRange(rng, -80, 80);
      const ex = Math.min(FRAME.x + FRAME.size, c2x + randRange(rng, 10, 40));
      const ey = Math.max(FRAME.y, Math.min(FRAME.y + FRAME.size, c2y + randRange(rng, -60, 60)));
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      cx = ex;
      cy = ey;
    }
    const strokeWidth = randRange(rng, 2, 6);
    const opacity = randRange(rng, 0.6, 1);
    parts.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" stroke-linecap="round" opacity="${opacity.toFixed(2)}"/>`
    );
  }
  return parts.join("");
}

function renderGuilloche(colors: string[], count: number, rng: () => number): string {
  // Fine engraved lattice — many thin concentric, offset, rotated ellipses layered together,
  // evoking the engine-turned engraving used on currency and certificates. Rare composición,
  // so it always renders with extra density regardless of the Densidad trait's base count.
  const parts: string[] = [];
  const rings = Math.max(count * 4, 20);
  const cx = FRAME.x + FRAME.size / 2;
  const cy = FRAME.y + FRAME.size / 2;
  for (let i = 0; i < rings; i++) {
    const color = colors[i % colors.length];
    const rx = 30 + i * (FRAME.size / 2 - 30) / rings + randRange(rng, -4, 4);
    const ry = rx * randRange(rng, 0.55, 0.85);
    const rotation = randRange(rng, 0, 180);
    const offsetX = randRange(rng, -14, 14);
    const offsetY = randRange(rng, -14, 14);
    const opacity = randRange(rng, 0.18, 0.4);
    parts.push(
      `<ellipse cx="${(cx + offsetX).toFixed(1)}" cy="${(cy + offsetY).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity.toFixed(2)}" transform="rotate(${rotation.toFixed(1)} ${(cx + offsetX).toFixed(1)} ${(cy + offsetY).toFixed(1)})"/>`
    );
  }
  return parts.join("");
}

function renderComposicion(
  composicion: string,
  colors: string[],
  count: number,
  rng: () => number
): string {
  switch (composicion) {
    case "Orbital":
      return renderOrbital(colors, count, rng);
    case "Constructiva":
      return renderConstructiva(colors, count, rng);
    case "Retícula":
      return renderReticula(colors, count, rng);
    case "Trazo":
      return renderTrazo(colors, count, rng);
    case "Guilloché":
      return renderGuilloche(colors, count, rng);
    default:
      return renderOrbital(colors, count, rng);
  }
}

// ---------------------------------------------------------------------------
// Acabado (finish) — overlays applied on top of the composition, still
// clipped to the frame. IDs are tokenId-scoped so multiple inlined SVGs
// (e.g. a marketplace grid) never collide.
// ---------------------------------------------------------------------------

function renderFinishOverlay(
  acabado: string,
  tokenId: number
): { defsExtra: string; overlay: string } {
  if (acabado === "Grabado") {
    const patternId = `hatch-${tokenId}`;
    const defsExtra = `<pattern id="${patternId}" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="6" stroke="${COLOR.ink}" stroke-width="0.6"/></pattern>`;
    const overlay = `<rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.size}" height="${FRAME.size}" fill="url(#${patternId})" opacity="0.22"/>`;
    return { defsExtra, overlay };
  }
  if (acabado === "Grano") {
    const filterId = `grain-${tokenId}`;
    const defsExtra = `<filter id="${filterId}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${tokenId}" result="noise"/><feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"/></filter>`;
    const overlay = `<rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.size}" height="${FRAME.size}" fill="${COLOR.ink}" filter="url(#${filterId})" opacity="0.15"/>`;
    return { defsExtra, overlay };
  }
  // Plano — flat, no overlay.
  return { defsExtra: "", overlay: "" };
}

// ---------------------------------------------------------------------------
// Full plate render
// ---------------------------------------------------------------------------

export function renderSvg(tokenId: number, traits: ObraTraits): string {
  const rng = mulberry32(fnv1aHash(`obra-render:${tokenId}`));
  const colors = paletteColors(traits["Paleta"]);
  const count = densityCount(traits["Densidad"], rng);
  const clipId = `frame-clip-${tokenId}`;

  const composition = renderComposicion(traits["Composición"], colors, count, rng);
  const finish = renderFinishOverlay(traits["Acabado"], tokenId);
  const seal = renderSeal(traits["Sello"], 392, 392, 76);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500" role="img" aria-label="OBRA #${tokenId} — ${traits["Composición"]}, ${traits["Paleta"]}">
  <defs>
    <clipPath id="${clipId}"><rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.size}" height="${FRAME.size}" rx="2"/></clipPath>
    ${finish.defsExtra}
  </defs>
  <rect x="0" y="0" width="500" height="500" fill="${COLOR.bg}"/>
  <rect x="28" y="28" width="444" height="444" rx="6" fill="${COLOR.surface}"/>
  <g clip-path="url(#${clipId})">
    ${composition}
    ${finish.overlay}
  </g>
  <rect x="${FRAME.x}" y="${FRAME.y}" width="${FRAME.size}" height="${FRAME.size}" fill="none" stroke="${COLOR.border}" stroke-width="2"/>
  ${seal}
</svg>
`;
}

// ---------------------------------------------------------------------------
// CLI runner — writes art/output/{id}.svg for tokenId 1-100
// ---------------------------------------------------------------------------

function main(): void {
  const outDir = path.join(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });
  for (let tokenId = 1; tokenId <= 100; tokenId++) {
    const traits = generateTraits(tokenId);
    const svg = renderSvg(tokenId, traits);
    fs.writeFileSync(path.join(outDir, `${tokenId}.svg`), svg, "utf8");
  }
  // eslint-disable-next-line no-console
  console.log(`OBRA: generated 100 SVGs -> ${outDir}`);
}

if (require.main === module) {
  main();
}
