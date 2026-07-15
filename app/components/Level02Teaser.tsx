import { Card } from "./ui/Card";
import { ExternalLinkIcon } from "./ui/icons";

const LEVEL_02_URL = "https://staking-protocol-chu.vercel.app";

interface Level02TeaserProps {
  className?: string;
}

/**
 * "Get CHU by staking → Level 02" link, required by the project spec on
 * both the mint page and the profile page — every OBRA transaction is paid
 * in CHU, so a wallet with none needs a clear path to get some.
 */
export function Level02Teaser({ className = "" }: Level02TeaserProps) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">Level 02 · CHU Protocol</span>
          <p className="mt-1 font-body text-sm text-ink">Need CHU? Stake to earn it, no lockup.</p>
        </div>
        <a
          href={LEVEL_02_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-4 py-2 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:border-primary"
        >
          Get CHU by staking
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    </Card>
  );
}
