"use client";

import Image from "next/image";
import { use, useMemo } from "react";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { isAddress } from "viem";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Level02Teaser } from "@/components/Level02Teaser";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileNftCard } from "@/components/profile/ProfileNftCard";
import { ProvenanceLedger } from "@/components/profile/ProvenanceLedger";
import { useOwnedTokenIds } from "@/lib/hooks/useOwnedTokens";
import { useListings } from "@/lib/hooks/useListings";
import { useMintSpend } from "@/lib/hooks/useMintSpend";
import { isProtocolDeployedOn } from "@/lib/config/contracts";
import { chainLabel, isActiveChain } from "@/lib/config/networks";

interface PageProps {
  params: Promise<{ address: string }>;
}

export default function ProfilePage({ params }: PageProps) {
  const { address: profileAddress } = use(params);
  const chainId = useChainId();
  const { address: connectedAddress } = useAccount();

  const deployed = isProtocolDeployedOn(chainId);
  const onSupportedChain = isActiveChain(chainId);
  const valid = isAddress(profileAddress);

  const { tokenIds: ownedTokenIds, refetch: refetchOwned } = useOwnedTokenIds(chainId, valid ? profileAddress : undefined);
  const { tokenIds: listedTokenIds, listings, refetch: refetchListings } = useListings(chainId);
  const { data: mintSpend, refetch: refetchMintSpend } = useMintSpend(chainId, valid ? profileAddress : undefined);

  const isOwnerViewing = valid && connectedAddress?.toLowerCase() === profileAddress.toLowerCase();

  // A token currently listed is held in escrow by ObraMarket — it no
  // longer appears in the seller's on-chain balance/enumeration — so the
  // profile's inventory is the union of directly-owned tokens and tokens
  // this address is the seller of, not `ownedTokenIds` alone.
  const listedByThisAddress = useMemo(
    () =>
      listedTokenIds
        .map((tokenId, i) => ({ tokenId, listing: listings[i] }))
        .filter(({ listing }) => listing.seller.toLowerCase() === profileAddress.toLowerCase()),
    [listedTokenIds, listings, profileAddress]
  );

  const allTokenIds = useMemo(() => {
    const set = new Map<string, bigint>();
    for (const id of ownedTokenIds) set.set(id.toString(), id);
    for (const { tokenId } of listedByThisAddress) set.set(tokenId.toString(), tokenId);
    return Array.from(set.values()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }, [ownedTokenIds, listedByThisAddress]);

  const totalListedValue = listedByThisAddress.reduce((sum, { listing }) => sum + listing.price, 0n);

  function refetchAll() {
    refetchOwned();
    refetchListings();
    refetchMintSpend();
  }

  if (!valid) {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
          <p className="font-body text-sm text-error">Not a valid address.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <ProfileHeader address={profileAddress} isOwnerViewing={isOwnerViewing} />

        {!onSupportedChain || !deployed ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
            {!onSupportedChain ? "Switch to a supported network to view this profile." : `OBRA isn't deployed on ${chainLabel(chainId)} yet.`}
          </div>
        ) : (
          <>
            <ProfileStats
              totalOwned={allTokenIds.length}
              totalSpentOnMints={mintSpend}
              totalListedValue={totalListedValue}
              tokenIds={allTokenIds}
            />

            <ProvenanceLedger chainId={chainId} address={profileAddress} />

            {allTokenIds.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
                <Image
                  src="/preview/12.svg"
                  alt=""
                  fill
                  aria-hidden="true"
                  className="pointer-events-none object-contain opacity-[0.06] grayscale"
                />
                <p className="relative">
                  No pieces yet.{" "}
                  {isOwnerViewing && (
                    <Link href="/" className="text-primary hover:underline">
                      Mint your first Obra
                    </Link>
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {allTokenIds.map((tokenId) => (
                  <ProfileNftCard
                    key={tokenId.toString()}
                    chainId={chainId}
                    tokenId={tokenId}
                    isOwnerViewing={isOwnerViewing}
                    onChanged={refetchAll}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {isOwnerViewing && <Level02Teaser />}
      </main>

      <Footer />
    </div>
  );
}
