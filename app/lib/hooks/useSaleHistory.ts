"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { MARKET_ABI, getContractAddress } from "../config/contracts";

export interface SaleEvent {
  buyer: string;
  seller: string;
  price: bigint;
  blockNumber: bigint;
  txHash: string;
}

/**
 * `getContractEvents` can't fully narrow `log.args` to `Bought`'s specific
 * fields at compile time — the ABI is loaded from JSON at runtime, not a
 * `const`-asserted literal, so viem falls back to a generic `Log` shape
 * with no `args`. Cast the raw return to this expected runtime shape
 * instead of fighting that inference; the actual field presence is still
 * checked below before use.
 */
interface RawBoughtLog {
  args: { buyer?: string; seller?: string; price?: bigint };
  blockNumber?: bigint;
  transactionHash?: string;
}

/**
 * Best-effort on-chain price history for a single token — reads past
 * `Bought` events directly from the chain via `getContractEvents` rather
 * than a backend/indexer (the project spec explicitly forbids a backend).
 * "Best-effort" because a public RPC's log-range limits vary — this is
 * fine at this collection's scale and testnet age; a production deployment
 * spanning years of history would want a real indexer instead.
 */
export function useSaleHistory(chainId: number | undefined, tokenId: bigint | undefined) {
  const marketAddress = getContractAddress(chainId, "market");
  const client = usePublicClient({ chainId });

  return useQuery({
    queryKey: ["obra-sale-history", chainId, marketAddress, tokenId?.toString()],
    queryFn: async (): Promise<SaleEvent[]> => {
      if (!client || !marketAddress || tokenId === undefined) return [];
      const logs = (await client.getContractEvents({
        address: marketAddress,
        abi: MARKET_ABI,
        eventName: "Bought",
        args: { tokenId },
        fromBlock: "earliest",
        toBlock: "latest",
      })) as RawBoughtLog[];
      return logs
        .map((log): SaleEvent | null => {
          const { buyer, seller, price } = log.args;
          if (!buyer || !seller || price === undefined) return null;
          return {
            buyer,
            seller,
            price,
            blockNumber: log.blockNumber ?? 0n,
            txHash: log.transactionHash ?? "",
          };
        })
        .filter((e): e is SaleEvent => e !== null);
    },
    enabled: Boolean(client && marketAddress && tokenId !== undefined),
    staleTime: 30_000,
    retry: false,
  });
}
