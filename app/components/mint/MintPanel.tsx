"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { TOKEN_SYMBOL, getContractAddress } from "@/lib/config/contracts";
import { Phase, phaseLabel, useCollectionStats } from "@/lib/hooks/useCollectionStats";
import { useApproveChu, useChuAllowance, useMint } from "@/lib/hooks/useObraActions";
import { getAllowlistProof, isAllowlisted } from "@/lib/allowlist";
import { formatTokenAmount, getTxErrorMessage } from "@/lib/format";
import { generateTraits, selloTier, type SelloTier } from "@/lib/art/traits";
import { useTxToast } from "../TxStatusToast";
import { StepIndicator } from "../StepIndicator";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { KeyIcon, SealIcon } from "../ui/icons";

interface MintPanelProps {
  chainId: number | undefined;
  onSuccess: () => void;
}

const GOLD_HEX = "#ddb049"; // contracts/art/generate.ts's COLOR.gold — the collection's own gold, not an unrelated hue.

/** Best tier across a batch of newly minted tokenIds — Double > Gold > vermilion. */
function bestSelloTier(mintedTokenIds: bigint[]): SelloTier {
  const tiers = mintedTokenIds.map((id) => selloTier(generateTraits(Number(id))["Sello"]));
  if (tiers.includes("double")) return "double";
  if (tiers.includes("gold")) return "gold";
  return "vermilion";
}

/** The mint-confirmed toast icon — a stamp-press animation, recolored (and
 * doubled) when the newly minted piece(s) include a rare Sello. No copy
 * change, no celebratory decoration — just the real trait rendered honestly. */
function mintConfirmIcon(tier: SelloTier) {
  if (tier === "double") {
    return (
      <span className="relative inline-block h-4 w-4">
        <SealIcon className="absolute inset-0 h-4 w-4 animate-stamp text-primary" />
        <SealIcon className="absolute inset-0 h-4 w-4 translate-x-1 translate-y-1 animate-stamp" style={{ color: GOLD_HEX }} />
      </span>
    );
  }
  if (tier === "gold") {
    return <SealIcon className="h-4 w-4 animate-stamp" style={{ color: GOLD_HEX }} />;
  }
  return <SealIcon className="h-4 w-4 animate-stamp text-secondary" />;
}

/**
 * Flow 1 — Approve CHU -> Mint, per BRAND.md §6, implemented at the same
 * rigor as Level 02's approve -> stake flow: step state, icon, button
 * weight, and copy all move together across the two steps. UI mode is
 * derived from live allowance vs. the required total (never manually
 * tracked step state).
 */
export function MintPanel({ chainId, onSuccess }: MintPanelProps) {
  const { address, isConnected } = useAccount();
  const { notify } = useTxToast();
  const [quantity, setQuantity] = useState(1);

  const stats = useCollectionStats(chainId);
  const obraAddress = getContractAddress(chainId, "obra");
  const { allowance, refetch: refetchAllowance } = useChuAllowance(chainId, obraAddress);
  const approveTx = useApproveChu(chainId, obraAddress);
  const mintTx = useMint(chainId);

  const deployed = Boolean(obraAddress);
  const remainingSupply =
    stats.maxSupply !== undefined && stats.totalSupply !== undefined ? stats.maxSupply - stats.totalSupply : undefined;
  const remainingWallet = stats.maxPerWallet !== undefined ? stats.maxPerWallet - stats.mintedByWallet : undefined;
  const maxMintable =
    remainingSupply !== undefined && remainingWallet !== undefined
      ? remainingSupply < remainingWallet
        ? remainingSupply
        : remainingWallet
      : undefined;

  const soldOut = remainingSupply !== undefined && remainingSupply <= 0n;
  const walletLimitReached = remainingWallet !== undefined && remainingWallet <= 0n;
  const proof = getAllowlistProof(address) ?? [];
  const allowlistBlocked = stats.phase === Phase.Allowlist && !isAllowlisted(address);

  const totalPrice = stats.mintPrice !== undefined ? stats.mintPrice * BigInt(quantity) : undefined;
  const insufficientBalance =
    totalPrice !== undefined && stats.chuBalance !== undefined && totalPrice > stats.chuBalance;
  const needsApproval = totalPrice !== undefined && (allowance === undefined || allowance < totalPrice);
  const approvedThisSession = approveTx.phase === "confirmed";

  type FlowMode =
    | "not-connected"
    | "closed"
    | "not-allowlisted"
    | "sold-out"
    | "wallet-limit"
    | "insufficient-balance"
    | "needs-approve"
    | "ready-after-approve"
    | "ready-direct";

  const flowMode: FlowMode = !isConnected
    ? "not-connected"
    : stats.phase === Phase.Closed
      ? "closed"
      : allowlistBlocked
        ? "not-allowlisted"
        : soldOut
          ? "sold-out"
          : walletLimitReached
            ? "wallet-limit"
            : insufficientBalance
              ? "insufficient-balance"
              : needsApproval
                ? "needs-approve"
                : approvedThisSession
                  ? "ready-after-approve"
                  : "ready-direct";

  function clampQuantity(next: number) {
    const max = maxMintable !== undefined ? Number(maxMintable) : 1;
    const clamped = Math.min(Math.max(1, next), Math.max(1, max));
    setQuantity(clamped);
    if (approvedThisSession) approveTx.reset();
  }

  async function handleApprove() {
    if (totalPrice === undefined) return;
    notify("pending", "Confirm the approval in your wallet…");
    try {
      await approveTx.approve(totalPrice);
      await refetchAllowance();
      notify("confirmed", `Approved ${formatTokenAmount(totalPrice)} ${TOKEN_SYMBOL} for minting.`);
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }

  async function handleMint() {
    notify("pending", "Confirm the mint transaction in your wallet…");
    try {
      await mintTx.mint(BigInt(quantity), stats.phase === Phase.Allowlist ? proof : []);
      const updated = await stats.refetch();
      const newTotal = updated.data?.[1]?.result as bigint | undefined;
      const label =
        newTotal !== undefined
          ? quantity === 1
            ? `Obra #${newTotal.toString()}`
            : `Obra #${(newTotal - BigInt(quantity) + 1n).toString()}–${newTotal.toString()}`
          : `${quantity} piece${quantity > 1 ? "s" : ""}`;
      const mintedTokenIds =
        newTotal !== undefined
          ? Array.from({ length: quantity }, (_, i) => newTotal - BigInt(quantity) + 1n + BigInt(i))
          : [];
      const tier = mintedTokenIds.length > 0 ? bestSelloTier(mintedTokenIds) : "vermilion";
      notify("confirmed", `Confirmed — ${label} minted.`, { icon: mintConfirmIcon(tier) });
      approveTx.reset();
      mintTx.reset();
      setQuantity(1);
      onSuccess();
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }

  const approvePending = approveTx.phase === "pending";
  const mintPending = mintTx.phase === "pending";

  return (
    <Card elevated>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">Mint an Obra</h2>
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-primary">{phaseLabel(stats.phase)} phase</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Price">
          {stats.mintPrice !== undefined ? `${formatTokenAmount(stats.mintPrice)} ${TOKEN_SYMBOL}` : "—"}
        </Stat>
        <Stat label="Remaining">
          {stats.totalSupply !== undefined && stats.maxSupply !== undefined
            ? `${(stats.maxSupply - stats.totalSupply).toString()} / ${stats.maxSupply.toString()}`
            : "—"}
        </Stat>
        <Stat label="Your mints">
          {stats.maxPerWallet !== undefined ? `${stats.mintedByWallet.toString()} / ${stats.maxPerWallet.toString()}` : "—"}
        </Stat>
        <Stat label="Allowlist">
          {!isConnected ? "—" : isAllowlisted(address) ? "You're on it" : "Not on it"}
        </Stat>
      </dl>

      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5">
        {flowMode === "not-connected" && (
          <p className="font-body text-sm text-muted">Connect your wallet to mint.</p>
        )}

        {flowMode === "closed" && (
          <p className="font-body text-sm text-muted">Minting hasn&apos;t opened yet — check back soon.</p>
        )}

        {flowMode === "not-allowlisted" && (
          <p className="font-body text-sm text-muted">
            This wallet isn&apos;t on the allowlist for the current phase. Public minting opens next.
          </p>
        )}

        {flowMode === "sold-out" && <p className="font-body text-sm text-muted">The collection is fully minted.</p>}

        {flowMode === "wallet-limit" && (
          <p className="font-body text-sm text-muted">
            You&apos;ve reached the {stats.maxPerWallet?.toString()}-per-wallet mint limit.
          </p>
        )}

        {(flowMode === "insufficient-balance" ||
          flowMode === "needs-approve" ||
          flowMode === "ready-after-approve" ||
          flowMode === "ready-direct") && (
          <>
            <QuantityStepper quantity={quantity} onChange={clampQuantity} max={maxMintable} disabled={mintPending || approvePending} />

            {flowMode === "insufficient-balance" && (
              <p className="font-body text-sm text-error">
                Insufficient {TOKEN_SYMBOL} balance — you need {formatTokenAmount(totalPrice)} {TOKEN_SYMBOL}.
              </p>
            )}

            {flowMode === "needs-approve" && (
              <>
                <StepIndicator
                  step1State="active"
                  step2State="upcoming"
                  step1Label={`Approve ${TOKEN_SYMBOL}`}
                  step2Label="Mint"
                />
                <p className="font-body text-[1.0625rem] leading-relaxed text-ink">
                  You&apos;re granting the Obra contract permission to move up to {formatTokenAmount(totalPrice)}{" "}
                  {TOKEN_SYMBOL} to cover the mint price. This is a one-time step per approval amount.
                </p>
                <Button
                  variant="outline-primary"
                  icon={<KeyIcon />}
                  pending={approvePending}
                  disabled={!deployed}
                  onClick={handleApprove}
                  fullWidth
                >
                  {approvePending ? "Confirming on-chain…" : `Step 1 of 2 — Approve ${TOKEN_SYMBOL}`}
                </Button>
              </>
            )}

            {flowMode === "ready-after-approve" && (
              <>
                <StepIndicator step1State="complete" step2State="active" step1Label={`Approve ${TOKEN_SYMBOL}`} step2Label="Mint" />
                <p className="font-body text-[1.0625rem] leading-relaxed text-ink">
                  Minting stamps {quantity === 1 ? "a new numbered piece" : `${quantity} new numbered pieces`} to your
                  wallet — {formatTokenAmount(totalPrice)} {TOKEN_SYMBOL}, {remainingSupply?.toString()} of{" "}
                  {stats.maxSupply?.toString()} remaining.
                </p>
                <Button variant="filled-primary" icon={<SealIcon />} pending={mintPending} disabled={!deployed} onClick={handleMint} fullWidth>
                  {mintPending ? "Confirming on-chain…" : "Step 2 of 2 — Mint"}
                </Button>
              </>
            )}

            {flowMode === "ready-direct" && (
              <Button variant="filled-primary" icon={<SealIcon />} pending={mintPending} disabled={!deployed} onClick={handleMint} fullWidth>
                {mintPending ? "Confirming on-chain…" : `Mint for ${formatTokenAmount(totalPrice)} ${TOKEN_SYMBOL}`}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="font-display text-lg font-medium text-ink">{children}</dd>
    </div>
  );
}

function QuantityStepper({
  quantity,
  onChange,
  max,
  disabled,
}: {
  quantity: number;
  onChange: (next: number) => void;
  max: bigint | undefined;
  disabled: boolean;
}) {
  const maxNum = max !== undefined ? Number(max) : undefined;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Quantity</span>
      <div className="flex items-center rounded-lg border border-border">
        <button
          type="button"
          disabled={disabled || quantity <= 1}
          onClick={() => onChange(quantity - 1)}
          className="px-3 py-1.5 font-mono text-ink transition-colors hover:bg-surface-high disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="min-w-8 text-center font-mono text-sm text-ink">{quantity}</span>
        <button
          type="button"
          disabled={disabled || (maxNum !== undefined && quantity >= maxNum)}
          onClick={() => onChange(quantity + 1)}
          className="px-3 py-1.5 font-mono text-ink transition-colors hover:bg-surface-high disabled:opacity-40"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      {maxNum !== undefined && <span className="font-mono text-xs text-muted">max {maxNum}</span>}
    </div>
  );
}
