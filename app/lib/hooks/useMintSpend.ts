"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { OBRA_ABI, getContractAddress } from "../config/contracts";

/**
 * `getContractEvents` can't fully narrow `log.args` at compile time for an
 * ABI loaded from JSON at runtime — see the matching note in
 * useSaleHistory.ts. Cast to this expected runtime shape instead.
 */
interface RawMintedLog {
  args: { totalPaid?: bigint };
}

/**
 * Total CHU spent minting, for a given wallet — reads past `Minted` events
 * directly from the chain (minter is an indexed event arg) rather than a
 * backend/indexer, same approach as `useSaleHistory`. Feeds the profile
 * page's "total spent on mints" stat.
 */
export function useMintSpend(chainId: number | undefined, address: string | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");
  const client = usePublicClient({ chainId });

  return useQuery({
    queryKey: ["obra-mint-spend", chainId, obraAddress, address],
    queryFn: async (): Promise<bigint> => {
      if (!client || !obraAddress || !address) return 0n;
      const logs = (await client.getContractEvents({
        address: obraAddress,
        abi: OBRA_ABI,
        eventName: "Minted",
        args: { minter: address as `0x${string}` },
        fromBlock: "earliest",
        toBlock: "latest",
      })) as RawMintedLog[];
      return logs.reduce((sum, log) => sum + (log.args.totalPaid ?? 0n), 0n);
    },
    enabled: Boolean(client && obraAddress && address),
    staleTime: 30_000,
    retry: false,
  });
}
