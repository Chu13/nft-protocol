import Image from "next/image";
import { Card } from "../ui/Card";

/**
 * Static preview of 9 representative pieces from the 100-piece collection,
 * satisfying the mint page's "preview of 4-9 NFTs" spec requirement. These
 * are pre-rendered by /contracts/art/generate.ts (see
 * /contracts/art/preview.md for the selection rationale — chosen to cover
 * all 5 trait dimensions, not cherry-picked for rarity) and served as
 * static files, independent of IPFS — the mint page shouldn't depend on
 * Phase 5's Pinata pin succeeding to render a preview.
 */
const PREVIEW_PIECES = [
  { id: 1, composicion: "Constructiva", paleta: "Hueso y Tinta" },
  { id: 2, composicion: "Retícula", paleta: "Vermellón" },
  { id: 6, composicion: "Guilloché", paleta: "Vermellón" },
  { id: 9, composicion: "Trazo", paleta: "Vermellón" },
  { id: 12, composicion: "Retícula", paleta: "Sala Verde" },
  { id: 35, composicion: "Guilloché", paleta: "Sala Verde" },
  { id: 47, composicion: "Trazo", paleta: "Sala Verde" },
  { id: 77, composicion: "Orbital", paleta: "Dorada" },
  { id: 93, composicion: "Orbital", paleta: "Vermellón" },
];

export function PreviewGrid() {
  return (
    <Card>
      <h3 className="font-display text-lg font-semibold text-ink sm:text-xl">The Collection</h3>
      <p className="mt-1 font-body text-sm text-muted">
        100 generative pieces. A sample of the range — every piece is a fixed, known composition; there is no reveal.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-3 sm:gap-4">
        {PREVIEW_PIECES.map((piece) => (
          <figure key={piece.id} className="overflow-hidden rounded-lg border border-border bg-bg">
            <Image
              src={`/preview/${piece.id}.svg`}
              alt={`Obra #${piece.id} — ${piece.composicion}, ${piece.paleta}`}
              width={240}
              height={240}
              className="h-auto w-full"
            />
            <figcaption className="border-t border-border px-2 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.05em] text-muted">
              #{piece.id} · {piece.composicion}
            </figcaption>
          </figure>
        ))}
      </div>
    </Card>
  );
}
