"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { MARKET_ABI, OBRA_ABI, getContractAddress } from "../config/contracts";

export interface ProvenanceEvent {
  type: "minted" | "bought" | "sold";
  tokenId: bigint;
  counterparty?: `0x${string}`;
  price?: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp?: number;
}

interface RawMintedLog {
  args: { minter?: string; startTokenId?: bigint; quantity?: bigint };
  blockNumber?: bigint;
  transactionHash?: string;
}

interface RawBoughtLog {
  args: { tokenId?: bigint; buyer?: string; seller?: string; price?: bigint };
  blockNumber?: bigint;
  transactionHash?: string;
}

/**
 * Public on-chain provenance for a wallet — every piece it has minted,
 * bought, or sold — reformatted from events this app already reads
 * elsewhere (see useSaleHistory.ts, useMintSpend.ts) into a per-wallet
 * timeline. No new indexer, no storage: same "best-effort getContractEvents,
 * fromBlock earliest" approach as the rest of this codebase. Visible on ANY
 * profile (this is public on-chain history, not owner-only data).
 */
export function useProvenance(chainId: number | undefined, address: string | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");
  const marketAddress = getContractAddress(chainId, "market");
  const client = usePublicClient({ chainId });

  const query = useQuery({
    queryKey: ["obra-provenance", chainId, obraAddress, marketAddress, address],
    queryFn: async (): Promise<ProvenanceEvent[]> => {
      if (!client || !obraAddress || !marketAddress || !address) return [];

      const [mintedLogs, boughtAsBuyerLogs, boughtAsSellerLogs] = await Promise.all([
        client.getContractEvents({
          address: obraAddress,
          abi: OBRA_ABI,
          eventName: "Minted",
          args: { minter: address as `0x${string}` },
          fromBlock: "earliest",
          toBlock: "latest",
        }) as Promise<RawMintedLog[]>,
        client.getContractEvents({
          address: marketAddress,
          abi: MARKET_ABI,
          eventName: "Bought",
          args: { buyer: address as `0x${string}` },
          fromBlock: "earliest",
          toBlock: "latest",
        }) as Promise<RawBoughtLog[]>,
        client.getContractEvents({
          address: marketAddress,
          abi: MARKET_ABI,
          eventName: "Bought",
          args: { seller: address as `0x${string}` },
          fromBlock: "earliest",
          toBlock: "latest",
        }) as Promise<RawBoughtLog[]>,
      ]);

      const events: ProvenanceEvent[] = [];

      for (const log of mintedLogs) {
        const { startTokenId, quantity } = log.args;
        if (startTokenId === undefined || quantity === undefined) continue;
        for (let i = 0n; i < quantity; i++) {
          events.push({
            type: "minted",
            tokenId: startTokenId + i,
            blockNumber: log.blockNumber ?? 0n,
            txHash: (log.transactionHash ?? "0x") as `0x${string}`,
          });
        }
      }

      for (const log of boughtAsBuyerLogs) {
        const { tokenId, seller, price } = log.args;
        if (tokenId === undefined) continue;
        events.push({
          type: "bought",
          tokenId,
          counterparty: seller as `0x${string}` | undefined,
          price,
          blockNumber: log.blockNumber ?? 0n,
          txHash: (log.transactionHash ?? "0x") as `0x${string}`,
        });
      }

      for (const log of boughtAsSellerLogs) {
        const { tokenId, buyer, price } = log.args;
        if (tokenId === undefined) continue;
        events.push({
          type: "sold",
          tokenId,
          counterparty: buyer as `0x${string}` | undefined,
          price,
          blockNumber: log.blockNumber ?? 0n,
          txHash: (log.transactionHash ?? "0x") as `0x${string}`,
        });
      }

      // Best-effort timestamp enrichment: one getBlock per DISTINCT block
      // number across this wallet's history (not per event), run in
      // parallel. A bounded N+1 — N is small for any single wallet in a
      // 100-piece collection — acceptable under this codebase's existing
      // "no indexer, best-effort" convention (see useSaleHistory.ts).
      const distinctBlocks = Array.from(new Set(events.map((e) => e.blockNumber)));
      const blocks = await Promise.all(
        distinctBlocks.map((blockNumber) =>
          client.getBlock({ blockNumber }).catch(() => undefined)
        )
      );
      const timestampByBlock = new Map<bigint, number>();
      distinctBlocks.forEach((blockNumber, i) => {
        const ts = blocks[i]?.timestamp;
        if (ts !== undefined) timestampByBlock.set(blockNumber, Number(ts));
      });
      for (const event of events) {
        event.timestamp = timestampByBlock.get(event.blockNumber);
      }

      return events.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : b.blockNumber < a.blockNumber ? -1 : 0));
    },
    enabled: Boolean(client && obraAddress && marketAddress && address),
    staleTime: 30_000,
    retry: false,
  });

  return { events: query.data ?? [], isLoading: query.isLoading };
}
