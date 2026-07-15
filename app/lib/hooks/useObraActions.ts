"use client";

import { useCallback, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Address } from "viem";
import { OBRA_ABI, MARKET_ABI, TOKEN_ABI, getContractAddress } from "../config/contracts";
import { wagmiConfig } from "../config/wagmi";

export type TxPhase = "idle" | "pending" | "confirmed" | "error";

interface ActionState {
  phase: TxPhase;
  hash: Address | undefined;
  error: Error | null;
}

const IDLE_STATE: ActionState = { phase: "idle", hash: undefined, error: null };

/**
 * Shared write+confirm plumbing for a single contract action (approve CHU /
 * mint / approve NFT / list / buy / cancel), driven imperatively rather than
 * via `useEffect` watching mutation state — the returned `run()` resolves
 * only once the transaction is mined, so callers can `await` it directly
 * inside a click handler and sequence toasts / refetches right there.
 * Mirrors Level 02's `useStakeActions.ts` `useContractAction` exactly.
 */
function useContractAction() {
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<ActionState>(IDLE_STATE);

  const run = useCallback(
    async (params: Parameters<typeof writeContractAsync>[0], actionChainId: number | undefined) => {
      setState({ phase: "pending", hash: undefined, error: null });
      try {
        const hash = await writeContractAsync(params);
        setState({ phase: "pending", hash, error: null });
        await waitForTransactionReceipt(wagmiConfig, { hash, chainId: actionChainId });
        setState({ phase: "confirmed", hash, error: null });
        return hash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ phase: "error", hash: undefined, error });
        throw error;
      }
    },
    [writeContractAsync]
  );

  const reset = useCallback(() => setState(IDLE_STATE), []);

  return { ...state, run, reset };
}

/** Live CHU `allowance(user, spender)` — Obra for the Mint flow, ObraMarket for the Buy flow. */
export function useChuAllowance(chainId: number | undefined, spender: Address | undefined) {
  const { address } = useAccount();
  const tokenAddress = getContractAddress(chainId, "token");
  const enabled = Boolean(tokenAddress && spender && address);

  const { data, refetch, isLoading } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: "allowance",
    args: address && spender ? [address, spender] : undefined,
    chainId,
    query: { enabled },
  });

  return { allowance: data as bigint | undefined, refetch, isLoading };
}

/** Approve `spender` to move up to `amount` CHU (exact amount, never infinite). */
export function useApproveChu(chainId: number | undefined, spender: Address | undefined) {
  const tokenAddress = getContractAddress(chainId, "token");
  const action = useContractAction();

  const approve = useCallback(
    (amount: bigint) => {
      if (!tokenAddress || !spender) {
        return Promise.reject(new Error("CHU isn't deployed on this network."));
      }
      return action.run(
        { address: tokenAddress, abi: TOKEN_ABI, functionName: "approve", args: [spender, amount], chainId },
        chainId
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokenAddress, spender, chainId]
  );

  return { approve, ...action };
}

/** Mint `quantity` Obra tokens, spending an Allowlist Merkle `proof` (ignored during the Public phase). */
export function useMint(chainId: number | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");
  const action = useContractAction();

  const mint = useCallback(
    (quantity: bigint, proof: `0x${string}`[]) => {
      if (!obraAddress) {
        return Promise.reject(new Error("Obra isn't deployed on this network."));
      }
      return action.run(
        { address: obraAddress, abi: OBRA_ABI, functionName: "mint", args: [quantity, proof], chainId },
        chainId
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obraAddress, chainId]
  );

  return { mint, ...action };
}

/** Whether ObraMarket is currently approved to transfer `tokenId` — single-token approve() OR setApprovalForAll. */
export function useNftApproval(chainId: number | undefined, tokenId: bigint | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");
  const marketAddress = getContractAddress(chainId, "market");
  const { address } = useAccount();

  const { data: approvedAddress, refetch: refetchApproved } = useReadContract({
    address: obraAddress,
    abi: OBRA_ABI,
    functionName: "getApproved",
    args: tokenId !== undefined ? [tokenId] : undefined,
    chainId,
    query: { enabled: Boolean(obraAddress && tokenId !== undefined) },
  });

  const { data: isApprovedForAll, refetch: refetchForAll } = useReadContract({
    address: obraAddress,
    abi: OBRA_ABI,
    functionName: "isApprovedForAll",
    args: address && marketAddress ? [address, marketAddress] : undefined,
    chainId,
    query: { enabled: Boolean(obraAddress && address && marketAddress) },
  });

  const approved =
    Boolean(marketAddress) && ((approvedAddress as Address | undefined) === marketAddress || isApprovedForAll === true);

  const refetch = useCallback(() => {
    refetchApproved();
    refetchForAll();
  }, [refetchApproved, refetchForAll]);

  return { approved, refetch };
}

/** Approve ObraMarket to transfer `tokenId` on the caller's behalf (Flow 3 Step 1). */
export function useApproveNft(chainId: number | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");
  const marketAddress = getContractAddress(chainId, "market");
  const action = useContractAction();

  const approve = useCallback(
    (tokenId: bigint) => {
      if (!obraAddress || !marketAddress) {
        return Promise.reject(new Error("Obra isn't deployed on this network."));
      }
      return action.run(
        { address: obraAddress, abi: OBRA_ABI, functionName: "approve", args: [marketAddress, tokenId], chainId },
        chainId
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obraAddress, marketAddress, chainId]
  );

  return { approve, ...action };
}

/** List `tokenId` for sale at `price` CHU. Requires prior `useApproveNft`. */
export function useListNft(chainId: number | undefined) {
  const marketAddress = getContractAddress(chainId, "market");
  const action = useContractAction();

  const list = useCallback(
    (tokenId: bigint, price: bigint) => {
      if (!marketAddress) {
        return Promise.reject(new Error("ObraMarket isn't deployed on this network."));
      }
      return action.run(
        { address: marketAddress, abi: MARKET_ABI, functionName: "list", args: [tokenId, price], chainId },
        chainId
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketAddress, chainId]
  );

  return { list, ...action };
}

/** Buy `tokenId` at its listed price. Requires prior `useApproveChu` for at least that price. */
export function useBuy(chainId: number | undefined) {
  const marketAddress = getContractAddress(chainId, "market");
  const action = useContractAction();

  const buy = useCallback(
    (tokenId: bigint) => {
      if (!marketAddress) {
        return Promise.reject(new Error("ObraMarket isn't deployed on this network."));
      }
      return action.run(
        { address: marketAddress, abi: MARKET_ABI, functionName: "buy", args: [tokenId], chainId },
        chainId
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketAddress, chainId]
  );

  return { buy, ...action };
}

/** Cancel an active listing, returning the NFT to the caller (must be the seller). */
export function useCancelListing(chainId: number | undefined) {
  const marketAddress = getContractAddress(chainId, "market");
  const action = useContractAction();

  const cancel = useCallback(
    (tokenId: bigint) => {
      if (!marketAddress) {
        return Promise.reject(new Error("ObraMarket isn't deployed on this network."));
      }
      return action.run(
        { address: marketAddress, abi: MARKET_ABI, functionName: "cancelListing", args: [tokenId], chainId },
        chainId
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketAddress, chainId]
  );

  return { cancel, ...action };
}
