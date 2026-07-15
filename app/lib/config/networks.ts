import type { Chain } from "viem";
import { mainnet, sepolia, bsc, bscTestnet, hardhat } from "viem/chains";

/**
 * Centralized network configuration. This is the ONLY place chain sets are
 * defined — components must import from here (or from `contracts.ts`, which
 * itself reads addresses per chain ID) rather than hardcoding chain data.
 *
 * `NEXT_PUBLIC_NETWORK_ENV` selects which chain set is "active" for the
 * running app instance:
 *   - "local"   -> Hardhat/localhost only (chainId 31337)
 *   - "testnet" -> BNB Chain Testnet (this project's current deploy target)
 *   - "mainnet" -> Ethereum mainnet + BNB Chain mainnet
 *
 * Unlike Level 02, "testnet" here is BNB-only — Sepolia stays structurally
 * wired (same pattern, same `activeFamilyChains` shape) but isn't part of
 * the active set yet, since this iteration only deploys to BNB Chain
 * Testnet. Adding Sepolia later is a one-line change to `activeChains`
 * below, not a refactor.
 *
 * Switching networks is meant to be "just an env var" — no per-component
 * chain literals anywhere else in the app.
 */

export type NetworkEnv = "local" | "testnet" | "mainnet";

function resolveNetworkEnv(): NetworkEnv {
  const raw = process.env.NEXT_PUBLIC_NETWORK_ENV?.trim().toLowerCase();
  if (raw === "local" || raw === "testnet" || raw === "mainnet") return raw;
  return "local";
}

export const NETWORK_ENV: NetworkEnv = resolveNetworkEnv();

export type ChainFamily = "ethereum" | "bnb";

/** Every chain the app structurally knows about, regardless of active env. */
export const ALL_CHAINS = { mainnet, sepolia, bsc, bscTestnet, hardhat } as const;

/** Chains selectable in each network environment, keyed by family. */
const FAMILY_CHAIN_BY_ENV: Record<NetworkEnv, Partial<Record<ChainFamily, Chain>>> = {
  local: { ethereum: hardhat },
  testnet: { bnb: bscTestnet },
  mainnet: { ethereum: mainnet, bnb: bsc },
};

export const activeFamilyChains = FAMILY_CHAIN_BY_ENV[NETWORK_ENV];

/** Ordered, non-empty tuple of chains active for the current env — what wagmi/RainbowKit is configured with. */
export const activeChains = (
  NETWORK_ENV === "local" ? [hardhat] : NETWORK_ENV === "testnet" ? [bscTestnet] : [mainnet, bsc]
) as [Chain, ...Chain[]];

/** The chain the app targets by default (first in the active set). */
export const defaultChain: Chain = activeChains[0];

export const CHAIN_LABELS: Record<number, string> = {
  [mainnet.id]: "Ethereum",
  [sepolia.id]: "Ethereum Sepolia",
  [bsc.id]: "BNB Chain",
  [bscTestnet.id]: "BNB Chain Testnet",
  [hardhat.id]: "Localhost (Hardhat)",
};

export function chainLabel(chainId: number | undefined): string {
  if (chainId === undefined) return "Unknown network";
  return CHAIN_LABELS[chainId] ?? `Chain ${chainId}`;
}

export function familyOf(chainId: number | undefined): ChainFamily | undefined {
  if (chainId === mainnet.id || chainId === sepolia.id || chainId === hardhat.id) return "ethereum";
  if (chainId === bsc.id || chainId === bscTestnet.id) return "bnb";
  return undefined;
}

export function chainForFamily(family: ChainFamily): Chain | undefined {
  return activeFamilyChains[family];
}

export function isActiveChain(chainId: number | undefined): boolean {
  if (chainId === undefined) return false;
  return activeChains.some((c) => c.id === chainId);
}

/** Block explorer "view token" URL for a given chain, sourced from viem's own `Chain.blockExplorers`. */
export function explorerTokenUrl(chainId: number | undefined, address: string): string | undefined {
  if (chainId === undefined) return undefined;
  const chain = Object.values(ALL_CHAINS).find((c) => c.id === chainId);
  const base = chain?.blockExplorers?.default.url;
  return base ? `${base}/token/${address}` : undefined;
}

/** Block explorer "view address" URL — used for the marketplace's seller/owner links. */
export function explorerAddressUrl(chainId: number | undefined, address: string): string | undefined {
  if (chainId === undefined) return undefined;
  const chain = Object.values(ALL_CHAINS).find((c) => c.id === chainId);
  const base = chain?.blockExplorers?.default.url;
  return base ? `${base}/address/${address}` : undefined;
}
