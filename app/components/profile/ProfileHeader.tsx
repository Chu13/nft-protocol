"use client";

import { useState } from "react";
import { truncateAddress } from "@/lib/format";
import { CopyIcon, CheckIcon } from "../ui/icons";

interface ProfileHeaderProps {
  address: string;
  isOwnerViewing: boolean;
}

export function ProfileHeader({ address, isOwnerViewing }: ProfileHeaderProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — silently no-op, the address is still
      // visible and selectable by hand.
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{truncateAddress(address)}</h1>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy address"
          className="rounded-lg border border-border p-2 text-muted transition-colors hover:border-primary hover:text-ink"
        >
          {copied ? <CheckIcon className="h-4 w-4 text-secondary" /> : <CopyIcon className="h-4 w-4" />}
        </button>
      </div>
      {isOwnerViewing && (
        <span className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.06em] text-primary">
          This is you
        </span>
      )}
    </div>
  );
}
