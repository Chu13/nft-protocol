import { formatUnits, parseUnits } from "viem";

/**
 * Formatting + math helpers for displaying on-chain token amounts.
 *
 * Rule of thumb enforced throughout this file: never cast a raw 18-decimal
 * wei bigint directly to `Number` for arithmetic — `Number.MAX_SAFE_INTEGER`
 * (2^53-1) is smaller than a single whole token already scaled to wei
 * (1e18), so naive float math silently loses precision. Always go through
 * viem's `formatUnits`/`parseUnits` to cross the wei <-> human-decimal
 * boundary, then it's safe to treat the resulting human-scale number as a
 * JS float for display/percentage purposes.
 */

/** Insert thousands separators into an unsigned integer digit string. */
function groupThousands(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format a wei-scaled bigint as a human-readable token amount string, e.g.
 * `50000000000000000000n` (18 decimals) -> "50".
 */
export function formatTokenAmount(value: bigint | undefined, decimals = 18, maxFractionDigits = 4): string {
  if (value === undefined) return "—";
  const formatted = formatUnits(value, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  const groupedWhole = groupThousands(whole);
  return trimmedFraction ? `${groupedWhole}.${trimmedFraction}` : groupedWhole;
}

/** Format a basis-points value (e.g. 500n or 500) as a percentage string, e.g. "5%" or "2.5%". */
export function formatBps(bps: bigint | number | undefined): string {
  if (bps === undefined) return "—";
  const pct = Number(bps) / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/** Parse a user-typed amount string into wei, or `undefined` if invalid/empty/zero. */
export function safeParseUnits(input: string, decimals = 18): bigint | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  // Reject anything that isn't a plain non-negative decimal number up front —
  // viem's parseUnits throws on garbage input, but we want a clean
  // `undefined` for form validation rather than a caught exception each render.
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") return undefined;
  try {
    const parsed = parseUnits(trimmed, decimals);
    return parsed > 0n ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Shorten a 0x address to the "0x2E...D9fc" shape used across the app. */
export function truncateAddress(address: string | undefined): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Extract a human-readable message from a wagmi/viem transaction error. */
export function getTxErrorMessage(error: unknown): string {
  if (!error) return "Something went wrong.";

  const err = error as {
    shortMessage?: string;
    message?: string;
    name?: string;
    cause?: { code?: number; message?: string };
  };

  const raw = err.shortMessage || err.message || String(error);

  if (err.cause?.code === 4001 || /user rejected/i.test(raw) || /user denied/i.test(raw)) {
    return "Rejected in wallet.";
  }

  if (/insufficient/i.test(raw) && /balance/i.test(raw)) {
    return "Insufficient CHU balance.";
  }

  if (/exceeds allowance|insufficient allowance/i.test(raw)) {
    return "Approval amount too low — approve again for this amount.";
  }

  // Obra/ObraMarket custom errors — surfaced with plain-language copy
  // rather than the raw Solidity error name, per the "name what happened"
  // voice rule.
  if (/ExceedsMaxSupply/.test(raw)) return "Not enough supply left for that quantity.";
  if (/ExceedsWalletLimit/.test(raw)) return "That would exceed your per-wallet mint limit.";
  if (/NotAllowlisted/.test(raw)) return "This wallet isn't on the allowlist for this phase.";
  if (/InvalidPhase/.test(raw)) return "Minting isn't open right now.";
  if (/EnforcedPause/.test(raw)) return "Minting is paused.";
  if (/ListingNotActive/.test(raw)) return "This listing is no longer active.";
  if (/NotTokenOwner/.test(raw)) return "You don't own this NFT.";
  if (/NotSeller/.test(raw)) return "Only the seller can cancel this listing.";

  if (/reverted|execution reverted/i.test(raw)) {
    return "Transaction failed on-chain.";
  }

  // Fall back to viem's shortMessage, which is already human-readable, or a
  // generic honest message rather than dumping a raw stack trace.
  return err.shortMessage || "Transaction failed on-chain.";
}
