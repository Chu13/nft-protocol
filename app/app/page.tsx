"use client";

import Link from "next/link";
import { useChainId } from "wagmi";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Level02Teaser } from "@/components/Level02Teaser";
import { MintPanel } from "@/components/mint/MintPanel";
import { PreviewGrid } from "@/components/mint/PreviewGrid";
import { GridIcon } from "@/components/ui/icons";
import { isProtocolDeployedOn } from "@/lib/config/contracts";
import { chainLabel, isActiveChain } from "@/lib/config/networks";
import { useCollectionStats } from "@/lib/hooks/useCollectionStats";

export default function MintPage() {
  const chainId = useChainId();
  const stats = useCollectionStats(chainId);

  const deployed = isProtocolDeployedOn(chainId);
  const onSupportedChain = isActiveChain(chainId);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">OBRA</h1>
          <p className="mt-2 max-w-xl font-body text-base text-muted">
            A 100-piece generative gallery. Mint, list, and collect — all in CHU.
          </p>
        </div>

        {onSupportedChain && deployed ? (
          <MintPanel chainId={chainId} onSuccess={() => stats.refetch()} />
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
            {!onSupportedChain
              ? "Switch to a supported network to mint."
              : `OBRA isn't deployed on ${chainLabel(chainId)} yet.`}
          </div>
        )}

        <PreviewGrid />

        <Link
          href="/marketplace"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:border-primary"
        >
          <GridIcon className="h-4 w-4" />
          View the collection in circulation on the marketplace
        </Link>

        <Level02Teaser />
      </main>

      <Footer />
    </div>
  );
}
