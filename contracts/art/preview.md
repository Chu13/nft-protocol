# OBRA — Collection Preview

Nine representative pieces, picked from the deterministic output of `generate.ts` (tokenId
range 1-100) to cover all five trait dimensions and demonstrate the range of the generator —
not cherry-picked to only show rarities, and not a random sample either. Rendered files live at
`art/output/preview/{id}.svg`; a single composited grid is at `art/preview-sheet.svg`.

This set is meant to satisfy the mint page's "preview of 4-9 NFTs" requirement (use any 4-9 of
these nine) and to give the README something concrete to screenshot before the full 100-piece
collection is minted.

## The nine

| tokenId | Composición | Paleta | Densidad | Acabado | Sello | Why it's here |
|---|---|---|---|---|---|---|
| 1 | Constructiva | Hueso y Tinta | Densa | Grano | Vermilion | Bars-and-diagonals composición, the near-mono bone/ink palette, dense + grainy — the "quiet" end of the collection |
| 2 | Retícula | Vermellón | Equilibrada | Grabado | Vermilion | Broken-grid composición, primary vermilion palette, engraved-line finish |
| 6 | Guilloché | Vermellón | Densa | Plano | Vermilion | Rare composición (~5% weight) at its densest, flat finish so the lattice itself carries the piece |
| 9 | Trazo | Vermellón | Equilibrada | Grabado | Vermilion | Flow-field line-work composición, a different finish/density combination from #2 |
| 12 | Retícula | Sala Verde | Mínima | Plano | Gold | The common palette (jade/ink on viridian) at its most minimal, paired with the rare Gold seal — shows Sello varies independently of Paleta rarity |
| 35 | Guilloché | Sala Verde | Equilibrada | Grano | Vermilion | Second Guilloché example, deliberately different palette/finish from #6 so the rare composición doesn't read as a single fixed look |
| 47 | Trazo | Sala Verde | Equilibrada | Grano | Gold | Flow-field work again, common palette, Gold seal |
| 77 | Orbital | Dorada | Mínima | Grabado | Vermilion | Rare Dorada (gold-leaf) palette (~4% weight) — the collection's other headline rarity besides Guilloché |
| 93 | Orbital | Vermellón | Mínima | Plano | Gold | Discs-and-arcs composición at its simplest — the cleanest, calmest piece in the set |

## Coverage check

- **Composición** — all 5 values represented: Orbital (77, 93), Constructiva (1), Retícula (2,
  12), Trazo (9, 47), Guilloché (6, 35).
- **Paleta** — 4 of 5 represented: Sala Verde, Vermellón, Hueso y Tinta, Dorada. **Espectro**
  (weight 1/100, the ultra-rare full-family palette) does not appear in tokenIds 1-100 under the
  current seed — expected, not a bug. At p=0.01 per token, the odds of zero occurrences across
  100 independent draws are ~37%; this run happened to land there. It will appear in some mints
  of the real 100-piece collection and some won't, same as any true 1%-weighted trait.
- **Densidad** — all 3 represented: Mínima (12, 77, 93), Equilibrada (2, 9, 35, 47), Densa (1, 6).
- **Acabado** — all 3 represented: Plano (12, 6, 93), Grabado (2, 9, 77), Grano (1, 35, 47).
- **Sello** — 2 of 3 represented: Vermilion (standard) and Gold (rare). **Double** (weight
  1/100, "signed twice") does not appear in this range for the same statistical reason as
  Espectro above — see `generate.ts`'s `renderSeal()` for how it renders when it does occur (two
  overlapping, counter-rotated stamps in vermilion + gold).

## Regenerating

```
cd contracts/art
npx ts-node generate.ts    # writes output/{1..100}.svg — idempotent, safe to re-run
```

`output/` (except the checked-in `output/preview/` subfolder) is disposable generated output —
safe to add to `.gitignore` once the repo's actual `.gitignore` is set up in a later phase, since
every file in it is fully reproducible from `traits.json` + `generate.ts`.
