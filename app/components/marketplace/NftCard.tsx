"use client";

import Image from "next/image";
import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useTokenMetadata } from "@/lib/hooks/useTokenMetadata";
import { formatTokenAmount, truncateAddress } from "@/lib/format";

interface NftCardProps {
  chainId: number | undefined;
  tokenId: bigint;
  /** Listed price in CHU wei, if this card is shown inside the marketplace grid. Omit for an unlisted profile card. */
  price?: bigint;
  seller?: string;
}

/**
 * Shared gallery-plate card — marketplace grid and profile grid both render
 * this. Per BRAND.md §4's price-readout/label split: this is a REPEATED,
 * in-grid price mention, so it's set in Fragment Mono as a Label, never the
 * Fraunces Price-readout role (reserved for singular hero price moments).
 */
export function NftCard({ chainId, tokenId, price, seller }: NftCardProps) {
  const { metadata, isLoading } = useTokenMetadata(chainId, tokenId);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary">
      <Link href={`/marketplace/${tokenId.toString()}`} className="flex flex-col">
        <div className="aspect-square w-full overflow-hidden bg-bg">
          {metadata?.image ? (
            <Image
              src={metadata.image}
              alt={metadata.name ?? `Obra #${tokenId.toString()}`}
              width={400}
              height={400}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
              {isLoading ? "Loading…" : "No image"}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-3 pb-2">
          <span className="font-display text-base font-medium text-ink">
            {metadata?.name ?? `Obra #${tokenId.toString()}`}
          </span>
          {price !== undefined ? (
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-primary">
              {formatTokenAmount(price)} {TOKEN_SYMBOL}
            </span>
          ) : (
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted">Not listed</span>
          )}
        </div>
      </Link>
      {seller && (
        // Separate from the card's own detail-page link — clicking the
        // seller specifically navigates to their profile, per spec.
        <Link
          href={`/profile/${seller}`}
          className="border-t border-border px-3 py-2 font-mono text-xs text-muted transition-colors hover:text-ink"
        >
          Seller: {truncateAddress(seller)}
        </Link>
      )}
    </div>
  );
}
