import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { formatTokenAmount } from "@/lib/format";
import { generateTraits, selloTier } from "@/lib/art/traits";
import { Card } from "../ui/Card";

const TOTAL_COMPOSICION_VALUES = 5;

interface ProfileStatsProps {
  totalOwned: number;
  totalSpentOnMints: bigint | undefined;
  totalListedValue: bigint;
  tokenIds: bigint[];
}

export function ProfileStats({ totalOwned, totalSpentOnMints, totalListedValue, tokenIds }: ProfileStatsProps) {
  const traitSummary = tokenIds.length > 0 ? buildTraitSummary(tokenIds) : undefined;

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

      {traitSummary && <p className="mt-4 border-t border-border pt-4 font-mono text-xs text-muted">{traitSummary}</p>}
    </Card>
  );
}

function buildTraitSummary(tokenIds: bigint[]): string {
  const traitsByToken = tokenIds.map((id) => generateTraits(Number(id)));

  const distinctComposiciones = new Set(traitsByToken.map((t) => t["Composición"]));
  const clauses = [`${distinctComposiciones.size} of ${TOTAL_COMPOSICION_VALUES} Composición values`];

  const hasGold = traitsByToken.some((t) => selloTier(t.Sello) === "gold");
  const hasDouble = traitsByToken.some((t) => selloTier(t.Sello) === "double");
  if (hasGold) clauses.push("includes 1 Gold Sello");
  if (hasDouble) clauses.push("includes 1 Double Sello");

  return clauses.join(" · ");
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="font-display text-lg font-medium tabular-nums text-ink">{children}</dd>
    </div>
  );
}
