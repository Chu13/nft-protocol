"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { OBRA_ABI, TOKEN_ABI, getContractAddress } from "../config/contracts";

/** Obra's Phase enum, mirroring the Solidity `enum Phase { Closed, Allowlist, Public }`. */
export enum Phase {
  Closed = 0,
  Allowlist = 1,
  Public = 2,
}

export function phaseLabel(phase: Phase | undefined): string {
  switch (phase) {
    case Phase.Closed:
      return "Closed";
    case Phase.Allowlist:
      return "Allowlist";
    case Phase.Public:
      return "Public";
    default:
      return "—";
  }
}

/**
 * Collection-wide read state for the mint page: phase, supply, price,
 * per-wallet limit, and (if connected) the caller's own minted count + CHU
 * balance. One batched multicall via `useReadContracts` rather than N
 * separate hooks, so the mint page renders from a single round trip.
 */
export function useCollectionStats(chainId: number | undefined) {
  const { address } = useAccount();
  const obraAddress = getContractAddress(chainId, "obra");
  const tokenAddress = getContractAddress(chainId, "token");
  const enabled = Boolean(obraAddress);

  const { data, refetch, isLoading } = useReadContracts({
    contracts: [
      { address: obraAddress, abi: OBRA_ABI, functionName: "phase", chainId },
      { address: obraAddress, abi: OBRA_ABI, functionName: "totalSupply", chainId },
      { address: obraAddress, abi: OBRA_ABI, functionName: "maxSupply", chainId },
      { address: obraAddress, abi: OBRA_ABI, functionName: "mintPrice", chainId },
      { address: obraAddress, abi: OBRA_ABI, functionName: "maxPerWallet", chainId },
      {
        address: obraAddress,
        abi: OBRA_ABI,
        functionName: "mintedByWallet",
        args: address ? [address] : undefined,
        chainId,
      },
      {
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId,
      },
    ],
    query: { enabled },
  });

  const [phase, totalSupply, maxSupply, mintPrice, maxPerWallet, mintedByWallet, chuBalance] = data ?? [];

  return {
    phase: phase?.result as Phase | undefined,
    totalSupply: totalSupply?.result as bigint | undefined,
    maxSupply: maxSupply?.result as bigint | undefined,
    mintPrice: mintPrice?.result as bigint | undefined,
    maxPerWallet: maxPerWallet?.result as bigint | undefined,
    mintedByWallet: (mintedByWallet?.result as bigint | undefined) ?? 0n,
    chuBalance: chuBalance?.result as bigint | undefined,
    isLoading,
    refetch,
  };
}

/** Live ERC-2981 royalty for a hypothetical sale at `price` CHU — used to preview the split before buying/listing. */
export function useRoyaltyInfo(chainId: number | undefined, tokenId: bigint | undefined, price: bigint | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");
  const { data } = useReadContract({
    address: obraAddress,
    abi: OBRA_ABI,
    functionName: "royaltyInfo",
    args: tokenId !== undefined && price !== undefined ? [tokenId, price] : undefined,
    chainId,
    query: { enabled: Boolean(obraAddress && tokenId !== undefined && price !== undefined) },
  });
  const [receiver, amount] = (data as [string, bigint] | undefined) ?? [undefined, undefined];
  return { royaltyReceiver: receiver, royaltyAmount: amount };
}
