"use client";

import { useCancelListing } from "@/lib/hooks/useObraActions";
import { getTxErrorMessage } from "@/lib/format";
import { useTxToast } from "../TxStatusToast";
import { Button } from "../ui/Button";

interface CancelListingButtonProps {
  chainId: number | undefined;
  tokenId: bigint;
  onSuccess: () => void;
}

/**
 * Single-transaction cancel — no approve step needed (the seller already
 * owns the approval that put the NFT in escrow; cancelling just asks
 * ObraMarket to hand it back).
 */
export function CancelListingButton({ chainId, tokenId, onSuccess }: CancelListingButtonProps) {
  const { notify } = useTxToast();
  const cancelTx = useCancelListing(chainId);
  const pending = cancelTx.phase === "pending";

  async function handleCancel() {
    notify("pending", "Confirm the cancellation in your wallet…");
    try {
      await cancelTx.cancel(tokenId);
      notify("confirmed", `Confirmed — Obra #${tokenId.toString()} listing cancelled.`);
      cancelTx.reset();
      onSuccess();
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }

  return (
    <Button variant="ghost" pending={pending} onClick={handleCancel} fullWidth>
      {pending ? "Confirming on-chain…" : "Cancel listing"}
    </Button>
  );
}
