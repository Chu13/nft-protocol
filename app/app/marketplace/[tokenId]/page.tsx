import type { Metadata } from "next";
import { TokenDetailClient } from "@/components/marketplace/TokenDetailClient";
import { resolveIpfsUri } from "@/lib/ipfs";
import ogExport from "../../../exports/og.json";

interface PageProps {
  params: Promise<{ tokenId: string }>;
}

// Collection size is fixed at deploy time (contracts/scripts/deploy.ts
// defaults MAX_SUPPLY to 100; MintPanel's sold-out copy and its
// MILESTONE_NOTE["100"] both describe the same 100-piece collection) and
// isn't otherwise exposed as a shared constant to server components — the
// live on-chain `maxSupply` is only readable client-side via wagmi.
const MAX_SUPPLY = 100;

function isValidTokenId(tokenId: string): boolean {
  if (!/^\d+$/.test(tokenId)) return false;
  const n = Number(tokenId);
  return n >= 1 && n <= MAX_SUPPLY;
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
  const imageUrl = isValidTokenId(tokenId)
    ? resolveIpfsUri(`ipfs://${ogExport.ogCid}/${tokenId}.png`)
    : undefined;
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
