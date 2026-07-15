"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/Card";
import { BuyPanel } from "@/components/marketplace/BuyPanel";
import { CancelListingButton } from "@/components/marketplace/CancelListingButton";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useListing } from "@/lib/hooks/useListings";
import { useTokenMetadata } from "@/lib/hooks/useTokenMetadata";
import { useSaleHistory } from "@/lib/hooks/useSaleHistory";
import { formatTokenAmount, truncateAddress } from "@/lib/format";

interface PageProps {
  params: Promise<{ tokenId: string }>;
}

export default function NftDetailPage({ params }: PageProps) {
  const { tokenId: tokenIdParam } = use(params);
  const tokenId = (() => {
    try {
      return BigInt(tokenIdParam);
    } catch {
      return undefined;
    }
  })();

  const chainId = useChainId();
  const { address } = useAccount();
  const { listing, refetch: refetchListing } = useListing(chainId, tokenId);
  const { metadata, isLoading: metadataLoading } = useTokenMetadata(chainId, tokenId);
  const { data: history } = useSaleHistory(chainId, tokenId);

  if (tokenId === undefined) {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
          <p className="font-body text-sm text-error">Invalid token id.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const isListed = listing?.active === true;
  const isSeller = isListed && address?.toLowerCase() === listing?.seller.toLowerCase();

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row">
        <div className="lg:w-1/2">
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-bg">
            {metadata?.image ? (
              <Image
                src={metadata.image}
                alt={metadata.name ?? `Obra #${tokenId.toString()}`}
                width={800}
                height={800}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
                {metadataLoading ? "Loading…" : "No image"}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:w-1/2">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">{metadata?.name ?? `Obra #${tokenId.toString()}`}</h1>
            {isListed && listing && (
              <p className="mt-2">
                <span className="font-display text-2xl font-medium tabular-nums text-ink">
                  {formatTokenAmount(listing.price)} {TOKEN_SYMBOL}
                </span>
                <Link href={`/profile/${listing.seller}`} className="ml-3 font-mono text-xs text-muted hover:text-ink">
                  Seller: {truncateAddress(listing.seller)}
                </Link>
              </p>
            )}
          </div>

          {metadata?.attributes && metadata.attributes.length > 0 && (
            <Card>
              <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Attributes</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {metadata.attributes.map((attr) => (
                  <div key={attr.trait_type} className="rounded-lg border border-border bg-bg px-3 py-2">
                    <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.05em] text-muted">{attr.trait_type}</dt>
                    <dd className="font-body text-sm text-ink">{attr.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          <Card elevated>
            {isListed ? (
              isSeller ? (
                <div className="flex flex-col gap-3">
                  <p className="font-body text-sm text-muted">You&apos;re the seller of this piece.</p>
                  <CancelListingButton chainId={chainId} tokenId={tokenId} onSuccess={refetchListing} />
                </div>
              ) : (
                <BuyPanel chainId={chainId} tokenId={tokenId} price={listing!.price} onSuccess={refetchListing} />
              )
            ) : (
              <p className="font-body text-sm text-muted">This piece isn&apos;t currently listed for sale.</p>
            )}
          </Card>

          {history && history.length > 0 && (
            <Card>
              <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Price History</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {history.map((sale) => (
                  <li key={sale.txHash} className="flex items-center justify-between font-mono text-xs text-muted">
                    <span>
                      {truncateAddress(sale.seller)} → {truncateAddress(sale.buyer)}
                    </span>
                    <span className="text-ink">
                      {formatTokenAmount(sale.price)} {TOKEN_SYMBOL}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
