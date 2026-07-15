import { http } from "viem";
import { createConfig } from "wagmi";
import { bsc, bscTestnet, mainnet, sepolia } from "viem/chains";
import { connectorsForWallets, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { activeChains } from "./networks";

/**
 * RainbowKit's `getDefaultConfig` wants a WalletConnect Cloud `projectId`,
 * and its WalletConnect-based wallets eagerly initialize Reown's AppKit
 * client (a remote config fetch) as soon as the provider mounts — with a
 * placeholder id that fetch just fails loudly in the console. Without a real
 * id, build a minimal wagmi config with only the injected (MetaMask-style
 * EIP-1193) connector, which is all that's needed for local/testnet
 * verification; with a real id, use the full `getDefaultConfig` wallet set.
 * Either way the app never crashes over a missing id. Same pattern as
 * Level 02's wagmi.ts.
 */
const FALLBACK_PROJECT_ID = "00000000000000000000000000000000";
const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
const hasRealProjectId = Boolean(rawProjectId) && rawProjectId !== FALLBACK_PROJECT_ID;
const projectId = rawProjectId || FALLBACK_PROJECT_ID;

/** Optional custom RPC URLs per chain — falls back to each chain's public default RPC when unset. */
const RPC_OVERRIDE_BY_CHAIN_ID: Record<number, string | undefined> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL,
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  [bsc.id]: process.env.NEXT_PUBLIC_BNB_MAINNET_RPC_URL,
  [bscTestnet.id]: process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL,
};

const transports = Object.fromEntries(
  activeChains.map((chain) => [chain.id, http(RPC_OVERRIDE_BY_CHAIN_ID[chain.id]?.trim() || undefined)])
);

export const wagmiConfig = hasRealProjectId
  ? getDefaultConfig({
      appName: "OBRA",
      projectId,
      chains: activeChains,
      transports,
      ssr: true,
    })
  : createConfig({
      chains: activeChains,
      transports,
      ssr: true,
      connectors: connectorsForWallets([{ groupName: "Browser Wallet", wallets: [injectedWallet] }], {
        appName: "OBRA",
        projectId,
      }),
    });
