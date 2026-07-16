/**
 * Client-side port of contracts/art/generate.ts's generateTraits() — same
 * FNV-1a hash + mulberry32 PRNG + weighted pick, so a token's traits can be
 * derived in the browser with zero network/IPFS calls, guaranteed to match
 * the canonical generator bit-for-bit (verified by scripts/verify-traits.ts).
 *
 * traits.json here is a manual copy of contracts/art/traits.json — re-copy
 * by hand if the collection's trait weights ever change (they won't; the
 * collection is minted and its metadata is already pinned to IPFS).
 */
import traitDefsJson from "./traits.json";

interface TraitValue {
  value: string;
  weight: number;
}

interface TraitDef {
  trait_type: string;
  values: TraitValue[];
}

const traitDefs = traitDefsJson as TraitDef[];

export interface ObraTraits {
  "Composición": string;
  "Paleta": string;
  "Densidad": string;
  "Acabado": string;
  "Sello": string;
}

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
 * Deterministically picks all 5 OBRA traits for a tokenId — pure function of
 * tokenId, identical to contracts/art/generate.ts's generateTraits().
 */
export function generateTraits(tokenId: number): ObraTraits {
  const rng = mulberry32(fnv1aHash(`obra-traits:${tokenId}`));
  const picked: Record<string, string> = {};
  for (const def of traitDefs) {
    picked[def.trait_type] = weightedPick(rng, def.values);
  }
  return picked as unknown as ObraTraits;
}

export type SelloTier = "vermilion" | "gold" | "double";

/** Maps a Sello trait value to its rarity tier. Throws on an unrecognized
 * value — should never happen since it's sourced from the same enum as
 * traits.json's Sello.values. */
export function selloTier(sello: string): SelloTier {
  switch (sello) {
    case "Vermilion":
      return "vermilion";
    case "Gold":
      return "gold";
    case "Double":
      return "double";
    default:
      throw new Error(`Unrecognized Sello value: "${sello}"`);
  }
}
