/**
 * Hover-revealed treatment matching a piece's Acabado (finish) trait —
 * Grano gets a faint fractal-noise grain (mirroring the same SVG filter
 * primitives contracts/art/generate.ts's renderFinishOverlay() uses for
 * "Grano", so the hover state previews the piece's real surface texture),
 * Grabado gets a faint engraved inner border, Plano gets nothing extra
 * (the card's existing hover:border-primary is the only effect).
 * Shared by NftCard and ProfileNftCard — both already fetch metadata
 * client-side, so this adds zero new reads.
 */
export function FinishOverlay({ acabado, tokenId }: { acabado: string | undefined; tokenId: bigint }) {
  if (acabado === "Grano") {
    const filterId = `grain-${tokenId.toString()}`;
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    );
  }
  if (acabado === "Grabado") {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 rounded-lg border border-ink/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    );
  }
  return null;
}
