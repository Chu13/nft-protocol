import allowlistExport from "../exports/allowlist.json";

/**
 * Client-side Merkle-proof lookup for the Allowlist mint phase. No backend —
 * the proof set is generated once (contracts/scripts/merkle.ts) and synced
 * to app/exports/allowlist.json (see the note in lib/config/contracts.ts);
 * the frontend just looks up the connected wallet's proof by address.
 *
 * A wallet not present in `addresses` is simply not allowlisted for this
 * phase — `getAllowlistProof` returning `undefined` is the normal "not on
 * the list" case, not an error.
 */
export function getAllowlistProof(address: string | undefined): `0x${string}`[] | undefined {
  if (!address) return undefined;
  const proof = (allowlistExport.addresses as Record<string, string[]>)[address.toLowerCase()];
  return proof as `0x${string}`[] | undefined;
}

export function isAllowlisted(address: string | undefined): boolean {
  return getAllowlistProof(address) !== undefined;
}
