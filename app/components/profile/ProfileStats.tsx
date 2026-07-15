import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { formatTokenAmount } from "@/lib/format";
import { Card } from "../ui/Card";

interface ProfileStatsProps {
  totalOwned: number;
  totalSpentOnMints: bigint | undefined;
  totalListedValue: bigint;
}

export function ProfileStats({ totalOwned, totalSpentOnMints, totalListedValue }: ProfileStatsProps) {
  return (
    <Card>
      <dl className="grid grid-cols-3 gap-4">
        <Stat label="Pieces owned">{totalOwned}</Stat>
        <Stat label="Spent on mints">
          {totalSpentOnMints !== undefined ? `${formatTokenAmount(totalSpentOnMints)} ${TOKEN_SYMBOL}` : "—"}
        </Stat>
        <Stat label="Listed value">
          {totalListedValue > 0n ? `${formatTokenAmount(totalListedValue)} ${TOKEN_SYMBOL}` : "—"}
        </Stat>
      </dl>
    </Card>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="font-display text-lg font-medium tabular-nums text-ink">{children}</dd>
    </div>
  );
}
