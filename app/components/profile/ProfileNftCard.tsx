"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useTokenMetadata } from "@/lib/hooks/useTokenMetadata";
import { useListing } from "@/lib/hooks/useListings";
import { formatTokenAmount } from "@/lib/format";
import { FinishOverlay } from "../marketplace/FinishOverlay";
import { CancelListingButton } from "../marketplace/CancelListingButton";
import { ListPanel } from "./ListPanel";

interface ProfileNftCardProps {
  chainId: number | undefined;
  tokenId: bigint;
  /** True when the connected wallet matches the profile being viewed — gates list/cancel actions. */
  isOwnerViewing: boolean;
  onChanged: () => void;
}

/**
 * One piece in a collector's inventory grid. Per spec: shows image, name,
 * attributes, and listing status; if listed, price + cancel (owner-only);
 * if unlisted, an option to list (owner-only).
 */
export function ProfileNftCard({ chainId, tokenId, isOwnerViewing, onChanged }: ProfileNftCardProps) {
  const { metadata } = useTokenMetadata(chainId, tokenId);
  const { listing, refetch: refetchListing } = useListing(chainId, tokenId);
  const [listing_, setListingOpen] = useState(false);
  const acabado = metadata?.attributes?.find((a) => a.trait_type === "Acabado")?.value;

  const isListed = listing?.active === true;

  function handleChanged() {
    refetchListing();
    onChanged();
    setListingOpen(false);
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <Link href={`/marketplace/${tokenId.toString()}`} className="relative aspect-square w-full overflow-hidden bg-bg">
        {metadata?.image && (
          <Image
            src={metadata.image}
            alt={metadata.name ?? `Obra #${tokenId.toString()}`}
            width={400}
            height={400}
            className="h-full w-full object-cover"
            unoptimized
          />
        )}
        <FinishOverlay acabado={acabado} tokenId={tokenId} />
      </Link>
      <div className="flex flex-col gap-2 p-3">
        <Link href={`/marketplace/${tokenId.toString()}`} className="font-display text-base font-medium text-ink hover:text-primary">
          {metadata?.name ?? `Obra #${tokenId.toString()}`}
        </Link>

        {isListed && listing ? (
          <>
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-primary">
              Listed · {formatTokenAmount(listing.price)} {TOKEN_SYMBOL}
            </span>
            {isOwnerViewing && <CancelListingButton chainId={chainId} tokenId={tokenId} onSuccess={handleChanged} />}
          </>
        ) : (
          <>
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted">Not listed</span>
            {isOwnerViewing &&
              (listing_ ? (
                <ListPanel chainId={chainId} tokenId={tokenId} onSuccess={handleChanged} onCancel={() => setListingOpen(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setListingOpen(true)}
                  className="rounded-lg border border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:border-primary"
                >
                  List for sale
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
