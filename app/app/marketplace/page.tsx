"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useChainId } from "wagmi";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NftCard } from "@/components/marketplace/NftCard";
import { SortIcon } from "@/components/ui/icons";
import { useListings } from "@/lib/hooks/useListings";
import { isProtocolDeployedOn } from "@/lib/config/contracts";
import { chainLabel, isActiveChain } from "@/lib/config/networks";

type SortOrder = "asc" | "desc";

export default function MarketplacePage() {
  const chainId = useChainId();
  const { tokenIds, listings, isLoading } = useListings(chainId);
  const [sort, setSort] = useState<SortOrder>("asc");

  const deployed = isProtocolDeployedOn(chainId);
  const onSupportedChain = isActiveChain(chainId);

  const sorted = useMemo(() => {
    const paired = tokenIds.map((tokenId, i) => ({ tokenId, listing: listings[i] }));
    return paired.sort((a, b) => {
      const diff = a.listing.price - b.listing.price;
      const cmp = diff > 0n ? 1 : diff < 0n ? -1 : 0;
      return sort === "asc" ? cmp : -cmp;
    });
  }, [tokenIds, listings, sort]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Marketplace</h1>
            <p className="mt-2 font-body text-sm text-muted">
              {sorted.length} piece{sorted.length === 1 ? "" : "s"} currently listed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSort((s) => (s === "asc" ? "desc" : "asc"))}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:border-primary"
          >
            <SortIcon className="h-3.5 w-3.5" />
            Price {sort === "asc" ? "ascending" : "descending"}
          </button>
        </div>

        {!onSupportedChain || !deployed ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
            {!onSupportedChain ? "Switch to a supported network to browse the marketplace." : `OBRA isn't deployed on ${chainLabel(chainId)} yet.`}
          </div>
        ) : isLoading ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">Loading listings…</div>
        ) : sorted.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
            <Image
              src="/preview/47.svg"
              alt=""
              fill
              aria-hidden="true"
              className="pointer-events-none object-contain opacity-[0.06] grayscale"
            />
            <p className="relative">Nothing listed yet — be the first to list a piece from your profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map(({ tokenId, listing }) => (
              <NftCard key={tokenId.toString()} chainId={chainId} tokenId={tokenId} price={listing.price} seller={listing.seller} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
