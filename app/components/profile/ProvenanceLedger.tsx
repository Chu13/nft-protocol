"use client";

import { useProvenance } from "@/lib/hooks/useProvenance";
import { Card } from "../ui/Card";

function formatDate(timestamp: number | undefined): string {
  if (timestamp === undefined) return "";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function ProvenanceLedger({ chainId, address }: { chainId: number | undefined; address: string }) {
  const { events, isLoading } = useProvenance(chainId, address);

  return (
    <Card>
      <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">Provenance</h2>

      {isLoading ? (
        <p className="mt-3 font-body text-sm text-muted">Loading…</p>
      ) : events.length === 0 ? (
        <p className="mt-3 font-body text-sm text-muted">No transactions recorded for this wallet yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {events.map((event) => {
            const date = formatDate(event.timestamp);
            const label =
              event.type === "sold" ? `Sold Obra #${event.tokenId.toString()}` : `Acquired Obra #${event.tokenId.toString()}`;
            return (
              <li key={`${event.txHash}-${event.tokenId.toString()}-${event.type}`} className="font-mono text-xs text-ink">
                {label}
                {date && <span className="text-muted"> — {date}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
