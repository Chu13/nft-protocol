"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  activeFamilyChains,
  chainLabel,
  defaultChain,
  familyOf,
  isActiveChain,
  type ChainFamily,
} from "@/lib/config/networks";
import { AlertTriangleIcon } from "./ui/icons";

const FAMILY_LABELS: Record<ChainFamily, string> = {
  ethereum: "Ethereum",
  bnb: "BNB Chain",
};

const FAMILIES = Object.keys(activeFamilyChains) as ChainFamily[];

/**
 * Persistent network-identity badge, per BRAND.md §6: always visible in the
 * header on every screen, never confined to a wallet-connect or transaction
 * modal. Deliberately neutral (`ink`/`muted`/`border` only) — the badge must
 * never borrow `primary`/`secondary`/`error`, since those three hues are
 * already reserved for transaction state elsewhere in the app; a network
 * badge that happened to render in an accent color would risk being misread
 * as a pending/error signal.
 *
 * This project currently deploys to BNB Chain Testnet only, so in practice
 * this renders as a single static pill rather than a toggle — the
 * multi-family branch stays wired for when Sepolia is added later.
 */
export function NetworkSelector() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const currentFamily = familyOf(chainId);
  const wrongNetwork = isConnected && !isActiveChain(chainId);

  return (
    <div className="flex flex-col gap-2">
      {FAMILIES.length > 1 ? (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {FAMILIES.map((family) => {
            const chain = activeFamilyChains[family];
            if (!chain) return null;
            const isSelected = currentFamily === family;
            return (
              <button
                key={family}
                type="button"
                disabled={isPending}
                onClick={() => switchChain({ chainId: chain.id })}
                className={[
                  "rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-[0.06em] transition-colors",
                  isSelected ? "bg-surface-high text-ink" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {FAMILY_LABELS[family]}
              </button>
            );
          })}
        </div>
      ) : (
        <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.06em] text-muted">
          <ChainMark chainId={defaultChain.id} />
          {chainLabel(defaultChain.id)}
        </span>
      )}

      {wrongNetwork && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-error/50 bg-surface-high px-3 py-2.5">
          <AlertTriangleIcon className="h-4 w-4 shrink-0 text-error" />
          <p className="font-body text-sm text-ink">
            You&apos;re connected to <span className="font-mono">{chainLabel(chainId)}</span>. Switch to{" "}
            <span className="font-mono">{chainLabel(defaultChain.id)}</span> to use OBRA.
          </p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: defaultChain.id })}
            disabled={isPending}
            className="ml-auto shrink-0 rounded-md border border-error bg-transparent px-3 py-1.5 font-body text-sm font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
          >
            {isPending ? "Switching…" : "Switch Network"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Small neutral chain glyph — BNB diamond or Ethereum diamond, kept monochrome to match the badge's neutral rule. */
function ChainMark({ chainId }: { chainId: number }) {
  const family = familyOf(chainId);
  if (family === "bnb") {
    return (
      <svg viewBox="0 0 24 24" width={12} height={12} aria-hidden>
        <path
          fill="currentColor"
          d="M12 2 14.5 4.5 12 7 9.5 4.5 12 2Zm-7 7L7.5 11.5 5 14 2.5 11.5 5 9Zm14 0 2.5 2.5L19 14l-2.5-2.5L19 9ZM12 9l2.5 2.5L12 14l-2.5-2.5L12 9Zm-3.5 6L11 17.5 8.5 20 6 17.5 8.5 15Zm7 0 2.5 2.5-2.5 2.5-2.5-2.5 2.5-2.5Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} aria-hidden>
      <path fill="currentColor" d="M12 2 5 12.5 12 16.5 19 12.5 12 2ZM5 14 12 22l7-8-7 4-7-4Z" />
    </svg>
  );
}
