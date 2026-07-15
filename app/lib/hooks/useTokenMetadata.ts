"use client";

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { OBRA_ABI, getContractAddress } from "../config/contracts";
import { resolveIpfsUri } from "../ipfs";

export interface NftAttribute {
  trait_type: string;
  value: string;
}

export interface NftMetadata {
  name: string;
  description?: string;
  image: string;
  attributes: NftAttribute[];
}

/**
 * Reads `tokenURI(tokenId)` on-chain, then fetches + parses the ERC-721
 * metadata JSON it points to (pinned on IPFS via Pinata — see Phase 5 /
 * lib/ipfs.ts). No backend: the contract is the source of truth for *which*
 * URI to fetch, IPFS is the source of truth for its contents.
 */
export function useTokenMetadata(chainId: number | undefined, tokenId: bigint | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");

  const { data: tokenUri } = useReadContract({
    address: obraAddress,
    abi: OBRA_ABI,
    functionName: "tokenURI",
    args: tokenId !== undefined ? [tokenId] : undefined,
    chainId,
    query: { enabled: Boolean(obraAddress && tokenId !== undefined) },
  });

  const resolvedUri = resolveIpfsUri(tokenUri as string | undefined);

  const {
    data: metadata,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["obra-metadata", resolvedUri],
    queryFn: async (): Promise<NftMetadata> => {
      const res = await fetch(resolvedUri!);
      if (!res.ok) throw new Error(`Failed to fetch metadata (${res.status})`);
      const json = (await res.json()) as NftMetadata;
      return { ...json, image: resolveIpfsUri(json.image) ?? json.image };
    },
    enabled: Boolean(resolvedUri),
    staleTime: 5 * 60_000,
  });

  return { metadata, isLoading, error };
}
