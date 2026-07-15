"use client";

import { useAccount, useReadContract } from "wagmi";
import { MARKET_ABI, TOKEN_ABI, TOKEN_SYMBOL, getContractAddress } from "@/lib/config/contracts";
import { useRoyaltyInfo } from "@/lib/hooks/useCollectionStats";
import { useApproveChu, useBuy, useChuAllowance } from "@/lib/hooks/useObraActions";
import { formatBps, formatTokenAmount, getTxErrorMessage } from "@/lib/format";
import { useTxToast } from "../TxStatusToast";
import { StepIndicator } from "../StepIndicator";
import { Button } from "../ui/Button";
import { KeyIcon, FrameIcon } from "../ui/icons";

interface BuyPanelProps {
  chainId: number | undefined;
  tokenId: bigint;
  price: bigint;
  onSuccess: () => void;
}

/** Flow 2 — Approve CHU -> Acquire, per BRAND.md §6. */
export function BuyPanel({ chainId, tokenId, price, onSuccess }: BuyPanelProps) {
  const { address, isConnected } = useAccount();
  const { notify } = useTxToast();
  const marketAddress = getContractAddress(chainId, "market");

  const { allowance, refetch: refetchAllowance } = useChuAllowance(chainId, marketAddress);
  const approveTx = useApproveChu(chainId, marketAddress);
  const buyTx = useBuy(chainId);
  const { royaltyAmount } = useRoyaltyInfo(chainId, tokenId, price);
  const { data: feeBps } = useReadContract({
    address: marketAddress,
    abi: MARKET_ABI,
    functionName: "feeBps",
    chainId,
    query: { enabled: Boolean(marketAddress) },
  });

  const { data: chuBalance } = useReadContract({
    address: getContractAddress(chainId, "token"),
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: Boolean(address) },
  });

  const insufficientBalance = chuBalance !== undefined && price > (chuBalance as bigint);
  const needsApproval = allowance === undefined || allowance < price;
  const approvedThisSession = approveTx.phase === "confirmed";
  const approvePending = approveTx.phase === "pending";
  const buyPending = buyTx.phase === "pending";

  // formatBps expects a basis-points value (e.g. 500 -> "5%") — derive the
  // royalty's effective bps from the amount/price ratio rather than a
  // percent, so both royalty and fee go through the same helper/format.
  const royaltyBpsEffective = royaltyAmount !== undefined && price > 0n ? (royaltyAmount * 10000n) / price : undefined;

  async function handleApprove() {
    notify("pending", "Confirm the approval in your wallet…");
    try {
      await approveTx.approve(price);
      await refetchAllowance();
      notify("confirmed", `Approved ${formatTokenAmount(price)} ${TOKEN_SYMBOL} for ObraMarket.`);
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }

  async function handleBuy() {
    notify("pending", "Confirm the transaction in your wallet…");
    try {
      await buyTx.buy(tokenId);
      notify("confirmed", `Confirmed — Obra #${tokenId.toString()} acquired for ${formatTokenAmount(price)} ${TOKEN_SYMBOL}.`);
      approveTx.reset();
      buyTx.reset();
      onSuccess();
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }

  if (!isConnected) {
    return <p className="font-body text-sm text-muted">Connect your wallet to acquire this piece.</p>;
  }

  if (insufficientBalance) {
    return (
      <p className="font-body text-sm text-error">
        Insufficient {TOKEN_SYMBOL} balance — you need {formatTokenAmount(price)} {TOKEN_SYMBOL}.
      </p>
    );
  }

  if (needsApproval && !approvedThisSession) {
    return (
      <div className="flex flex-col gap-3">
        <StepIndicator step1State="active" step2State="upcoming" step1Label={`Approve ${TOKEN_SYMBOL}`} step2Label="Acquire" />
        <p className="font-body text-[1.0625rem] leading-relaxed text-ink">
          You&apos;re granting ObraMarket permission to move up to {formatTokenAmount(price)} {TOKEN_SYMBOL} to cover
          this piece&apos;s listed price.
        </p>
        <Button variant="outline-primary" icon={<KeyIcon />} pending={approvePending} onClick={handleApprove} fullWidth>
          {approvePending ? "Confirming on-chain…" : `Step 1 of 2 — Approve ${TOKEN_SYMBOL}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <StepIndicator step1State="complete" step2State="active" step1Label={`Approve ${TOKEN_SYMBOL}`} step2Label="Acquire" />
      <p className="font-body text-[1.0625rem] leading-relaxed text-ink">
        Acquiring transfers {formatTokenAmount(price)} {TOKEN_SYMBOL} to the seller — minus a{" "}
        {formatBps(royaltyBpsEffective)} royalty to the creator and a {formatBps(feeBps as bigint | undefined)}{" "}
        marketplace fee — and this piece to your wallet.
      </p>
      <Button variant="filled-primary" icon={<FrameIcon />} pending={buyPending} onClick={handleBuy} fullWidth>
        {buyPending ? "Confirming on-chain…" : "Step 2 of 2 — Acquire"}
      </Button>
    </div>
  );
}
