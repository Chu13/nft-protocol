"use client";

import { useReadContract } from "wagmi";
import { MARKET_ABI, getContractAddress } from "../config/contracts";

export interface Listing {
  seller: string;
  price: bigint;
  active: boolean;
}

/** Every currently-active listing on ObraMarket — the marketplace grid's data source. */
export function useListings(chainId: number | undefined) {
  const marketAddress = getContractAddress(chainId, "market");

  const { data, refetch, isLoading } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "getListings",
    chainId,
    query: { enabled: Boolean(marketAddress) },
  });

  const [tokenIds, listings] = (data as [bigint[], Listing[]] | undefined) ?? [[], []];
  return { tokenIds, listings, isLoading, refetch };
}

/** A single token's listing (zero/default values if never listed) — the NFT detail page's data source. */
export function useListing(chainId: number | undefined, tokenId: bigint | undefined) {
  const marketAddress = getContractAddress(chainId, "market");

  const { data, refetch, isLoading } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "getListing",
    args: tokenId !== undefined ? [tokenId] : undefined,
    chainId,
    query: { enabled: Boolean(marketAddress && tokenId !== undefined) },
  });

  return { listing: data as Listing | undefined, isLoading, refetch };
}
