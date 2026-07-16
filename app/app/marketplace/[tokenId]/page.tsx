import type { Metadata } from "next";
import { TokenDetailClient } from "@/components/marketplace/TokenDetailClient";
import { resolveIpfsUri } from "@/lib/ipfs";
import ogExport from "../../../exports/og.json";

interface PageProps {
  params: Promise<{ tokenId: string }>;
}

// Next.js merges metadata per top-level key across the segment tree — a
// child route's `openGraph` object REPLACES the parent layout's `openGraph`
// entirely rather than deep-merging individual fields, so title/description
// are restated here (not omitted) to avoid silently blanking them for every
// token detail page. Keep this description in sync with the one in
// app/app/layout.tsx's root `metadata.openGraph.description` if that ever
// changes.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tokenId } = await params;
  const imageUrl = resolveIpfsUri(`ipfs://${ogExport.ogCid}/${tokenId}.png`);
  return {
    openGraph: {
      title: `Obra #${tokenId} — Signed by Chu. Paid in CHU.`,
      description: "A 100-piece generative NFT gallery. Mint, list, and collect — all in CHU.",
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default function NftDetailPage() {
  return <TokenDetailClient />;
}
