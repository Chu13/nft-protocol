import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/Card";
import { KeyIcon, SealIcon, PriceTagIcon, FrameIcon } from "@/components/ui/icons";

interface Shot {
  src: string;
  caption: string;
}

function SectionHeading({ number, title, icon }: { number: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-primary">{number}</span>
      <span className="text-primary">{icon}</span>
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
    </div>
  );
}

function ShotGrid({ shots, cols }: { shots: Shot[]; cols: 1 | 2 | 3 }) {
  const gridCols = cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";
  return (
    <div className={`mt-4 grid grid-cols-1 gap-4 ${gridCols}`}>
      {shots.map((shot) => (
        <figure key={shot.src} className="flex flex-col gap-2">
          <div className="relative aspect-[3/2] overflow-hidden rounded-lg border border-border bg-surface-high">
            <Image
              src={shot.src}
              alt={shot.caption}
              fill
              className="object-contain"
              sizes={cols === 3 ? "(min-width: 640px) 33vw, 100vw" : cols === 2 ? "(min-width: 640px) 50vw, 100vw" : "100vw"}
            />
          </div>
          <figcaption className="font-mono text-xs text-muted">{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">How it works</h1>
          <p className="mt-2 max-w-xl font-body text-base text-muted">
            Four steps, all on-chain, all paid in CHU — captured from the live app.
          </p>
        </div>

        <Card>
          <SectionHeading number="01" title="Get CHU" icon={<KeyIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            CHU is the ecosystem&apos;s ERC-20 token, deployed once in Level 02 (CHU Protocol) and imported here by
            address — OBRA never re-deploys it. Every payment in OBRA — minting, buying, listing — is denominated in
            CHU, never ETH or BNB. If a connected wallet holds none, both the mint page and the profile page link out
            to Level 02&apos;s staking dashboard to get some, no lockup required.
          </p>
          <ShotGrid shots={[{ src: "/how-it-works/get-chu.png", caption: "Get CHU by staking, from the mint page" }]} cols={1} />
        </Card>

        <Card>
          <SectionHeading number="02" title="Mint" icon={<SealIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            Minting is two clearly-signposted steps. Step 1 grants the Obra contract an allowance to move up to the
            total CHU price out of your wallet — a one-time approval per amount. Step 2 executes the mint itself,
            stamping a new numbered piece straight to your wallet.
          </p>
          <ShotGrid
            cols={3}
            shots={[
              { src: "/how-it-works/mint-approve.png", caption: "Step 1 — approve" },
              { src: "/how-it-works/mint-sign.png", caption: "Step 2 — mint" },
              { src: "/how-it-works/mint-confirmed.png", caption: "Confirmed on-chain" },
            ]}
          />
        </Card>

        <Card>
          <SectionHeading number="03" title="Marketplace" icon={<PriceTagIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            Every piece currently for sale is browsable and sortable by price. Buying follows the same
            approve-then-act pattern as minting. Listing a piece you own, or cancelling a listing, happens from your
            own profile page, not here.
          </p>
          <ShotGrid
            cols={2}
            shots={[
              { src: "/how-it-works/marketplace-grid.png", caption: "Every piece currently listed" },
              { src: "/how-it-works/buy-flow.png", caption: "Approve, then buy" },
            ]}
          />
        </Card>

        <Card>
          <SectionHeading number="04" title="Your collection" icon={<FrameIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            Any wallet&apos;s profile is public and read-only — paste in any address to see what it holds. List and
            cancel actions only appear when you&apos;re viewing your own connected wallet.
          </p>
          <ShotGrid
            cols={3}
            shots={[
              { src: "/how-it-works/profile-collection.png", caption: "A collector's profile" },
              { src: "/how-it-works/profile-list.png", caption: "Listing a piece for sale" },
              { src: "/how-it-works/piece-detail.png", caption: "A single piece, in detail" },
            ]}
          />
        </Card>
      </main>

      <Footer />
    </div>
  );
}
