"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { OBRA_ABI, getContractAddress } from "../config/contracts";

/**
 * Every Obra tokenId owned by `ownerAddress` — powers the collector-profile
 * page with zero backend/indexer, via `ERC721Enumerable.tokenOfOwnerByIndex`.
 * Two-stage read: `balanceOf` first, then a batched multicall for each
 * index — cheap at this collection's scale (max 100 tokens total, and a
 * single wallet's balance is capped at `maxPerWallet`, currently 3).
 */
export function useOwnedTokenIds(chainId: number | undefined, ownerAddress: string | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");

  const {
    data: balance,
    refetch: refetchBalance,
    isLoading: balanceLoading,
  } = useReadContract({
    address: obraAddress,
    abi: OBRA_ABI,
    functionName: "balanceOf",
    args: ownerAddress ? [ownerAddress] : undefined,
    chainId,
    query: { enabled: Boolean(obraAddress && ownerAddress) },
  });

  const count = Number((balance as bigint | undefined) ?? 0n);
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  const {
    data: tokenIdResults,
    refetch: refetchIds,
    isLoading: idsLoading,
  } = useReadContracts({
    contracts: indices.map((i) => ({
      address: obraAddress,
      abi: OBRA_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: ownerAddress ? [ownerAddress, BigInt(i)] : undefined,
      chainId,
    })),
    query: { enabled: Boolean(obraAddress && ownerAddress && count > 0) },
  });

  const tokenIds = (tokenIdResults ?? [])
    .map((r) => r.result as bigint | undefined)
    .filter((v): v is bigint => v !== undefined);

  function refetch() {
    refetchBalance();
    refetchIds();
  }

  return { tokenIds, balance: balance as bigint | undefined, isLoading: balanceLoading || idsLoading, refetch };
}
