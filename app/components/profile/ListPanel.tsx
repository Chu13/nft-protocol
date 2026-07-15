"use client";

import { useState } from "react";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useApproveNft, useListNft, useNftApproval } from "@/lib/hooks/useObraActions";
import { formatTokenAmount, getTxErrorMessage, safeParseUnits } from "@/lib/format";
import { useTxToast } from "../TxStatusToast";
import { StepIndicator } from "../StepIndicator";
import { Button } from "../ui/Button";
import { TagLockIcon, PriceTagIcon } from "../ui/icons";

interface ListPanelProps {
  chainId: number | undefined;
  tokenId: bigint;
  onSuccess: () => void;
  onCancel: () => void;
}

/** Flow 3 — Approve OBRA -> List, per BRAND.md §6. */
export function ListPanel({ chainId, tokenId, onSuccess, onCancel }: ListPanelProps) {
  const { notify } = useTxToast();
  const [priceInput, setPriceInput] = useState("");
  const price = safeParseUnits(priceInput);

  const { approved, refetch: refetchApproval } = useNftApproval(chainId, tokenId);
  const approveTx = useApproveNft(chainId);
  const listTx = useListNft(chainId);

  const approvedThisSession = approveTx.phase === "confirmed" || approved;
  const approvePending = approveTx.phase === "pending";
  const listPending = listTx.phase === "pending";

  async function handleApprove() {
    notify("pending", "Confirm the approval in your wallet…");
    try {
      await approveTx.approve(tokenId);
      await refetchApproval();
      notify("confirmed", `Approved ObraMarket to transfer Obra #${tokenId.toString()}.`);
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }

  async function handleList() {
    if (!price) return;
    notify("pending", "Confirm the listing in your wallet…");
    try {
      await listTx.list(tokenId, price);
      notify("confirmed", `Confirmed — Obra #${tokenId.toString()} listed for ${priceInput} ${TOKEN_SYMBOL}.`);
      approveTx.reset();
      listTx.reset();
      onSuccess();
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-3">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.05em] text-muted">
          Asking price ({TOKEN_SYMBOL})
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          disabled={approvePending || listPending}
          placeholder="0.00"
          className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-ink outline-none focus:border-primary"
        />
      </label>

      {!price ? (
        <p className="font-body text-xs text-muted">Enter a price to continue.</p>
      ) : !approvedThisSession ? (
        <>
          <StepIndicator step1State="active" step2State="upcoming" step1Label="Approve OBRA" step2Label="List" />
          <p className="font-body text-sm leading-relaxed text-ink">
            You&apos;re granting ObraMarket permission to transfer this piece on your behalf if it sells. You keep it
            in your wallet until then.
          </p>
          <Button variant="outline-primary" icon={<TagLockIcon />} pending={approvePending} onClick={handleApprove} fullWidth>
            {approvePending ? "Confirming on-chain…" : "Step 1 of 2 — Approve OBRA"}
          </Button>
        </>
      ) : (
        <>
          <StepIndicator step1State="complete" step2State="active" step1Label="Approve OBRA" step2Label="List" />
          <p className="font-body text-sm leading-relaxed text-ink">
            Listing sets {formatTokenAmount(price)} {TOKEN_SYMBOL} as the asking price. You can cancel anytime before
            it sells.
          </p>
          <Button variant="filled-primary" icon={<PriceTagIcon />} pending={listPending} onClick={handleList} fullWidth>
            {listPending ? "Confirming on-chain…" : "Step 2 of 2 — List"}
          </Button>
        </>
      )}

      <button type="button" onClick={onCancel} className="font-mono text-[0.6875rem] text-muted hover:text-ink">
        Cancel
      </button>
    </div>
  );
}
