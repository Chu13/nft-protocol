# OBRA — Brand Identity System

**Level 03 of the Jesus Bordones (Chuzzo) portfolio ecosystem — NFT Minting DApp + Marketplace**

This document is the complete, standalone brand specification for OBRA. A frontend engineer
with no further context should be able to implement the visual design correctly from this file
and `/brand/assets/` alone. It also doubles as the design brief `/contracts/art/generate.ts`
was built against — the collection art and the app chrome are one system, not two.

---

## 1. Naming

### Collection: OBRA (ERC-721 `Obra`, symbol `OBRA`)

**Obra** is Spanish for "the work" — a piece, a work of art, the thing an artist makes and
signs. Where Level 01 (**Sextant**) named the instrument and Level 02 (**CHU**) named the
maker, Level 03 names the output: the throughline across all three levels is now complete —
*Sextant (the instrument) → CHU (the name) → OBRA (the work)*. Each level's name answers a
different question about the same act of building, rather than reaching for a fourth unrelated
metaphor.

Choosing a Spanish word (over an invented English NFT-space name — "Vault," "Genesis,"
"Forge," all considered and rejected as generic/overused in the NFT space) follows the same
"authorship, not metaphor" logic CHU's naming doc established, and does something CHU's own
all-English identity couldn't: it authors the collection's *trait dimensions* in Spanish too
(§ below) — Composición, Paleta, Densidad, Acabado, Sello — so the naming decision isn't
cosmetic, it sets the register for the entire collection.

### Marketplace: ObraMarket

Named directly and functionally — `Obra` is the collection contract, `ObraMarket` is the
marketplace contract, same "contract name states what it is" convention CHU used for its own
protocol contract. No separate marketplace brand name was considered; unlike CHU's
token-vs-app naming question (where two genuinely different products needed a decision),
OBRA and ObraMarket are two contracts serving one collection and one buyer/collector
experience — splitting them into separately branded products would fragment a single
narrative for no benefit.

**In-app tagline (functional, used in the product header/mint page chrome):**
> Mint, list, collect — all in CHU.

States the three things the app actually does and names the payment currency plainly — same
"clear over clever" instinct as CHU's own functional tagline.

**Brand line (for storytelling contexts — README hero, OG card, about copy, not UI chrome):**
> Signed by Chu. Paid in CHU.

Ties the seal mark's literal function (every generated piece is stamped) to the ecosystem's
payment currency in one line — reads as a signature line, not a slogan.

### Non-contradiction check

The portfolio site (`Chu-Website/src/data/projects.ts`, Level 03 entry, currently titled
`"NFT Minting DApp"`) carries its own existing marketing copy:

> tagline: `"Mint with the token. Close the loop."`

That line lives on the portfolio site and stays as-is — it's written from the *portfolio's*
point of view (proving the L02→L03 economic loop closes), not the product's. OBRA's own
taglines above are for use *inside the product itself* and don't contradict it: both express
the same underlying fact (mint currency = CHU, not ETH/BNB) in different registers for
different audiences. The portfolio copy still refers to the project by its working title, not
`OBRA` — updating `projects.ts` to the final name is out of scope here (that file belongs to
`Chu-Website`, not this repo) and is noted as a follow-up for whoever next touches that repo.

---

## 2. Relationship to both siblings

OBRA is a **family member of both existing systems, not a reskin of either**. Same builder,
same instincts (dark-first, flat surfaces, restrained accent-carries-meaning color, a mono
face reserved for labels/data, honest state communication, real verified contrast) — different
specific choices, on purpose, at every layer that matters for a viewer to tell the three
systems apart at a glance.

| Dimension | Chu-Website ("The Arcade Cabinet") | CHU (Level 02) | **OBRA (Level 03)** |
|---|---|---|---|
| Base hue | violet-black, `oklch(_ _ 305)` | navy-black, `oklch(_ _ 240)` | **viridian-black, `oklch(_ _ 165)`** |
| Hue separation from OBRA's base (165°) | 140° | 75° | — |
| Primary accent | magenta-violet | amber/gold, `oklch(_ _ 75)` | **vermilion, `oklch(_ _ 40)`** |
| Secondary accent | lime | seafoam teal, `oklch(_ _ 175)` | **jade, `oklch(_ _ 155)`** |
| Error/tertiary accent | — | coral-red, `oklch(_ _ 25)` | **crimson-rose, `oklch(_ _ 10)`** |
| Display face | Unbounded | Bricolage Grotesque | **Fraunces** (first serif in the family) |
| Body face | Hanken Grotesk | Plus Jakarta Sans | **Instrument Sans** |
| Mono/label face | Martian Mono | IBM Plex Mono | **Fragment Mono** |
| Logo language | site-wide zone marks | fin/keel-blade silhouette | **seal/chop stamp with signature stroke** |
| Naming logic | portfolio persona (Chu/Chuzzo) | authorship (named after the maker) | **the output itself ("obra" = the work)** |

**The hue triangle.** Base hues sit at 165° (OBRA), 240° (CHU), and 305° (portfolio) —
separations of 75°, 65°, and 140° around the wheel. No two systems are hue-adjacent; placed
side by side, a viewer sees three different systems in the same family, not one system
recolored twice. OBRA's separation from CHU (75°) closely tracks the ~80° CHU itself targeted
against the portfolio, and OBRA's separation from the portfolio (140°) is the largest gap of
the three — appropriate, since OBRA and the portfolio are the two systems least likely to be
viewed adjacently in normal use.

**What OBRA deliberately does NOT share with either sibling:**
- Not CHU's amber/seafoam pairing, not the portfolio's magenta-violet/lime — vermilion/jade is
  its own pair, chosen for what it needs to say (see §3), not to echo either sibling's mood.
- **Secondary is not "CHU's seafoam moved a bit."** Jade sits at hue 155 — an *on-hue lift* of
  OBRA's own 165° base (lighter, more saturated, same family of green), not an import of CHU's
  175° seafoam. The 20° gap keeps them visibly distinct if ever shown together.
- No shared typefaces with either sibling, full stop — nine total typefaces now exist across
  the three systems (Unbounded/Hanken Grotesk/Martian Mono, Bricolage Grotesque/Plus Jakarta
  Sans/IBM Plex Mono, Fraunces/Instrument Sans/Fragment Mono) and zero of them repeat.
- **OBRA is the only one of the three with a serif display face.** This is deliberate, not
  incidental: a serif reads as "the art level" the instant you see it, the same way CHU's amber
  nods to brass instruments without needing to spell it out.
- No "zone" color system (portfolio) and no pure transaction-state duo (CHU) — OBRA needs
  *three* semantic accents (pending / confirmed / error, §6) plus a fourth extended art-only
  palette (§3) purely for the generative collection itself, since the collection's own Paleta
  trait needs colors the UI chrome never touches.

---

## 3. Color System

All colors specified in **oklch** (source of truth) with pre-computed **hex** fallback for
tooling that doesn't parse `oklch()` yet. Hex values were computed via the actual oklch→sRGB
conversion (Björn Ottosson's OKLab matrices — linear RGB, gamma-encoded, no shortcuts), and
every listed value is confirmed in-gamut (no clipping).

| Token | oklch | hex | Role |
|---|---|---|---|
| `bg` | `oklch(14% 0.030 165)` | `#000d06` | App canvas — deep viridian-black |
| `surface` | `oklch(20% 0.040 165)` | `#011c11` | Elevation step 1 — cards, panels, the NFT plate mat |
| `surface-high` | `oklch(26% 0.045 165)` | `#0a2b1e` | Elevation step 2 — active cards, modals, popovers |
| `border` | `oklch(33% 0.040 165)` | `#203c30` | Hairline borders (decorative — see note below); also the NFT plate's frame line |
| `ink` | `oklch(97% 0.020 165)` | `#e9faf2` | Primary text |
| `muted` | `oklch(74% 0.035 165)` | `#97b2a5` | Secondary/supporting text |
| `primary` | `oklch(68% 0.190 40)` | `#f5642b` | Vermilion "artist's seal" red — CTAs, mint/acquire/list actions, pending state, the seal mark itself |
| `primary-deep` | `oklch(60% 0.130 40)` | `#c06240` | Primary hover/pressed fill |
| `secondary` | `oklch(72% 0.130 155)` | `#57bc80` | Jade — confirmed/success, step-2-complete |
| `secondary-deep` | `oklch(58% 0.100 155)` | `#438c60` | Secondary hover/pressed fill |
| `error` | `oklch(64% 0.170 10)` | `#de5774` | Crimson-rose — failed/rejected transactions |
| `error-deep` | `oklch(48% 0.130 10)` | `#98374d` | Error hover/pressed fill |

Machine-readable copy of this table: `/brand/assets/palette.json`.

### Extended art palette (collection generator only)

Three additional colors exist purely for `/contracts/art/generate.ts` — the Paleta trait needs
tones the UI chrome never uses. Not core UI tokens; do not use these in app chrome.

| Token | oklch | hex | Role |
|---|---|---|---|
| `bone` | `oklch(88% 0.020 80)` | `#ded6c9` | Hueso y Tinta palette trait — warm bone neutral |
| `gold` | `oklch(78% 0.130 85)` | `#ddb049` | Dorada palette trait + Gold Sello variant |
| `gold-deep` | `oklch(60% 0.110 85)` | `#9e7a23` | Gold accent shade, used in Espectro's full-family rotation |

### Verified contrast ratios (WCAG 2.1)

Body text requires ≥4.5:1 AA. All text-on-background pairings below clear that bar:

| Pair | Ratio | Passes AA (4.5:1)? |
|---|---|---|
| `ink` on `bg` | **18.32:1** | Yes — AAA |
| `muted` on `bg` | **8.70:1** | Yes — AAA |
| `ink` on `surface` | 16.52:1 | Yes |
| `muted` on `surface` | 7.85:1 | Yes |
| `ink` on `surface-high` | 14.10:1 | Yes |
| `muted` on `surface-high` | 6.70:1 | Yes |
| `primary` on `bg` (as text/icon) | 6.36:1 | Yes |
| `secondary` on `bg` (as text/icon) | 8.40:1 | Yes |
| `error` on `bg` (as text/icon) | 5.40:1 | Yes |
| `primary-deep` on `bg` (as text/icon) | 4.77:1 | Yes (tight — avoid at small sizes) |
| `secondary-deep` on `bg` (as text/icon) | 4.87:1 | Yes (tight — avoid at small sizes) |
| `error-deep` on `bg` (as text/icon) | **2.82:1** | **No** — fill-only, see below |

### Text-on-fill pairings (buttons, chips, badges)

Unlike CHU (which had exactly one "deep" color flip to light text), OBRA has one flip too —
`error-deep` — for the same reason: it's dark enough that neither `bg` nor `ink` text is
comfortable, and `ink` is the better of the two options. Use this table exactly:

| Fill | Text color to use | Ratio |
|---|---|---|
| `primary` | `bg` (near-black) | 6.36:1 |
| `primary-deep` | `bg` (near-black) | 4.77:1 — tight, avoid at small sizes |
| `secondary` | `bg` (near-black) | 8.40:1 |
| `secondary-deep` | `bg` (near-black) | 4.87:1 — tight, avoid at small sizes |
| `error` | `bg` (near-black) | 5.40:1 |
| `error-deep` | **`ink`** (near-white — flips here) | 6.50:1 |

`ink` (white) directly on `primary`, `secondary`, or `error` fills fails contrast (2.88:1,
2.18:1, 3.39:1 respectively) — never put white text on an unmodified accent-color button.

### Border note

`border` on `bg` is 1.65:1 — intentionally low, essentially identical in spirit (and almost
in number) to CHU's own 1.63:1 hairline-border choice; this is a genuine family trait, not a
coincidence. This is fine *because borders are never the only signal* — every state change in
this system pairs color with an icon or label (§7). Don't try to raise border contrast to meet
text-contrast thresholds.

---

## 4. Typography

Three faces, same division of labor as both siblings (display / body / mono-for-labels),
three faces neither sibling uses. All are real, free, variable Google Fonts (except Fragment
Mono, which ships as a single static weight — see note below) — loadable via
`next/font/google` or a standard `<link>`.

- **Display: [Fraunces](https://fonts.google.com/specimen/Fraunces)** (variable — weight axis
  300-900, plus `opsz` 9-144 optical-size axis, plus `SOFT` and `WONK` axes). A serif with real
  ink-trap character — the first serif face across all three systems, which is exactly why it's
  here: it marks OBRA as "the art level" the instant it renders, the same way a gallery
  placard's serif headline differs from a dashboard's grotesk. **Do not enable `WONK` or push
  `SOFT` high** — those axes tip Fraunces into a playful/handwritten register that doesn't suit
  OBRA's quieter gallery voice (§5); keep close to default axis values.
- **Body: [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans)** (variable —
  weight 400-700). Clean, neutral, high-legibility grotesk-adjacent sans built for UI text —
  deliberately the *plainest* of the three body faces across the ecosystem (versus Hanken
  Grotesk's warmth or Plus Jakarta Sans's roundness), so it recedes and lets Fraunces and the
  collection art itself carry the personality.
- **Mono/label: [Fragment Mono](https://fonts.google.com/specimen/Fragment+Mono)** (weight 400
  regular + italic only — **no bold weight exists for this face**, unlike CHU's IBM Plex Mono
  which has 400/500/600). Reserved for labels, data, wallet addresses, tokenIds, trait values,
  and the network badge — never headlines or body copy. Chosen specifically because it reads
  as a **museum placard / catalog number**, not a code editor — the opposite instinct from
  faces like JetBrains Mono or Space Mono, and a deliberate step further from "hacker terminal"
  than even CHU's own Plex Mono choice. **Because there's no bold weight**, use uppercase +
  letter-spacing + color for emphasis in labels instead of reaching for `font-weight: 700`.

### Type scale

| Role | Font | Weight | Size | Line-height | Notes |
|---|---|---|---|---|---|
| Display | Fraunces (`opsz` ~72) | 600 | `clamp(2.5rem, 1.75rem + 3vw, 4.75rem)` | 1.05 | Wordmark lockups, marketplace hero, collection title |
| Headline | Fraunces (`opsz` ~36) | 600 | `clamp(1.5rem, 1.25rem + 1.5vw, 2.25rem)` | 1.15 | Section titles — "The Collection," "Your Pieces," NFT detail title |
| **Price readout** | Fraunces (`opsz` ~48), tabular-nums | 500 | `clamp(1.75rem, 1.5rem + 1.5vw, 2.5rem)` | 1.1 | **Singular hero price moments only** — the mint price stat on the mint page, an NFT detail page's current price/highest listing. See rule below — this is *not* where every price in the app goes. |
| Body-lg | Instrument Sans | 400–500 | 1.125rem / 18px | 1.6 | Explainers, empty states, the approve/mint/buy/list copy in §6 |
| Body | Instrument Sans | 400 | 1rem / 16px | 1.6 | Standard UI copy, form helper text, trait descriptions |
| Label | Fragment Mono | 400, uppercase | 0.75–0.8125rem | 1.4, tracking +0.08em | Field labels, table headers, status chips, **in-grid/list price mentions**, wallet addresses, tokenIds, trait values, network badge |

**The price-readout / label split (a rule this app needs that neither sibling did):** CHU
priced everything through its display face because a staking dashboard has one number that
matters. OBRA has *many* prices on screen at once — every card in the marketplace grid, every
row in a profile's inventory — so treating all of them as display-face stat readouts would
read as a page of headlines, not a catalog. The rule: a **singular** price moment (the mint
page's big price, an NFT detail page's current/highest price) is a Price readout, set in
Fraunces with tabular figures, because it's the one number on that view the user came to read.
**Repeated** price mentions inside a grid or list — the marketplace's card grid, a profile's
inventory rows — are set in Fragment Mono as Labels, exactly the "catalog number" register the
face was chosen for. This is what keeps the marketplace grid reading like a gallery catalog
rather than a spreadsheet of headlines.

**Rule (mirrors both siblings' own mono-discipline):** Fragment Mono never carries a headline
or a paragraph of body copy — labels, data, and chrome only, even in its one expanded role
above (in-grid prices are still labels, not stat readouts, no matter how prominent the grid
card is).

---

## 5. Voice & Tone

CHU's voice guide was written for a staking dashboard. OBRA is a gallery — the register shifts
accordingly: quieter, more curatorial, less "product," without becoming precious or losing any
of the underlying honesty CHU's voice rules were built on.

1. **Curatorial, not salesy.** Describe pieces and traits like a catalog entry — "Composición:
   Guilloché · Paleta: Dorada" — not ad copy. No "🔥 RARE!!", no exclamation points on trait
   chips. Let the rarity numbers (§ traits.json weights) speak for themselves; a 5%-weight trait
   doesn't need to be told it's special.
2. **Quiet confidence, pushed further than CHU's.** CHU's rule was "confident, not hypey" — OBRA
   takes the same instinct into a hushed-gallery register: prefer "Acquire" over "Buy now,"
   prefer stating the exact price and royalty split over "Don't miss this piece!" No countdown
   timers dramatizing supply unless the contract's actual phase state requires showing one.
3. **Respect authorship — trait names stay in Spanish.** Composición, Paleta, Densidad,
   Acabado, and Sello are not translated in UI copy, ever, even in an otherwise-English
   interface. This is the same "sign the work, don't launder it into a generic name" instinct
   that chose "Obra" over an invented English name in §1 — it would be inconsistent to make
   that call for the collection name and then translate the trait vocabulary anyway.
4. **Teach the two-step flow plainly, in whichever of the three flows applies.** One sentence of
   *why*, not a modal's worth of explanation, not baby-talk — same rule as CHU §5, now applied
   three times (approve→mint, approve→buy, approve-NFT→list) because OBRA has three distinct
   approval moments instead of CHU's one. See §6 for the exact copy per step.
5. **Honest chain state, no faked completion.** Pending is pending — "Confirming on-chain…"
   never a fabricated progress bar. A minted piece's traits are exactly what the contract
   assigned; never imply a piece "might" be rarer than its stated traits or hint at reveal
   mechanics (there are none — see the project spec's explicit no-reveal scope).

---

## 6. Transaction & Flow States

OBRA has **three** distinct two-step approve-flows, not CHU's one — each is the riskiest UX
moment on its respective screen, and each gets the same explicit, redundant-signal treatment
CHU's approve→stake spec established: button style, icon, label, stepper, copy, and motion all
move together per step. Never restyle one button in place with a text-only swap.

**Structural rule (shared by all three flows):** the two steps occupy the same button position
in the layout, changing state/appearance as the user progresses. A persistent 2-node stepper
sits above the button for the duration of the flow and disappears once the second transaction
confirms. Step 1 is always an outline/ghost treatment (`primary`-colored border and text,
transparent or `surface` fill) — deliberately lighter weight, since approving isn't the action
the user came for. Step 2 is always solid fill in `primary`, text `bg` (per §3's table) —
visually heavier, because it's the real action.

**Icon convention across flows:** approving CHU (ERC-20) always uses the same key/unlock
glyph, in both the Mint flow's Step 1 and the Buy flow's Step 1 — it's the same underlying
action (granting the token contract spend permission), so it gets the same icon regardless of
which flow it's part of. Approving the *NFT itself* (List flow's Step 1) uses a different
glyph — a small tag-with-lock icon — specifically so a user can never mistake "I'm approving my
token spend" for "I'm approving my NFT to be transferable." This distinction matters more here
than it did for CHU, which only ever had one thing to approve.

### Flow 1 — Approve CHU → Mint

**Step 1 of 2 — Approve CHU**
- **Button style:** outline/ghost, `primary` border and text.
- **Icon:** key/unlock glyph.
- **Label:** `Step 1 of 2 — Approve CHU`
- **Stepper:** node 1 filled/active `primary`, node 2 outlined/`muted`.
- **Copy above the button (Body-lg):** *"You're granting the Obra contract permission to move
  up to [amount] CHU to cover the mint price. This is a one-time step per approval amount."*
- **Motion:** static at rest; `primary`-colored pulse/glow while the approval tx is pending.

**Step 2 of 2 — Mint**
- **Button style:** solid fill `primary`, text `bg`.
- **Icon:** the seal glyph, small scale — minting is literally the act of stamping a new piece
  into existence, so reusing the seal mark here (rather than a generic "+" or checkmark) ties
  the button directly to the brand mark, not just to CHU's convention of swapping icons.
- **Label:** `Step 2 of 2 — Mint`
- **Stepper:** node 1 complete (checkmark/solid dot), node 2 filled/active `primary`.
- **Copy above the button:** *"Minting stamps a new numbered piece to your wallet — [price] CHU,
  [n] of [supply] remaining."*
- **Motion:** same pulse-only-while-pending rule.

### Flow 2 — Approve CHU → Acquire (buy)

**Step 1 of 2 — Approve CHU**
- Identical treatment to Flow 1's Step 1 (same icon, same button style) — it is the same
  underlying transaction type.
- **Label:** `Step 1 of 2 — Approve CHU`
- **Copy above the button:** *"You're granting ObraMarket permission to move up to [amount] CHU
  to cover this piece's listed price."*

**Step 2 of 2 — Acquire**
- **Button style:** solid fill `primary`, text `bg`.
- **Icon:** a small piece-into-frame glyph (an artwork sliding into a frame outline) —
  distinct from Mint's seal icon, since acquiring is a different act than minting even though
  both are Step-2 `primary` actions.
- **Label:** `Step 2 of 2 — Acquire` — "Acquire" is the visible button word (matches the
  gallery register in §5), but the helper copy underneath always states the transaction in
  unambiguous plain terms so the softer button label never creates confusion about what's
  actually happening.
- **Copy above the button:** *"Acquiring transfers [price] CHU to the seller — minus a
  [royalty]% royalty to the creator and a [fee]% marketplace fee — and this piece to your
  wallet."*
- **Motion:** same pulse-only-while-pending rule.

### Flow 3 — Approve NFT → List

**Step 1 of 2 — Approve OBRA**
- **Button style:** outline/ghost, `primary` border and text (same weight logic as the other
  two flows' Step 1).
- **Icon:** tag-with-lock glyph — deliberately *not* the key icon, see the icon convention note
  above.
- **Label:** `Step 1 of 2 — Approve OBRA`
- **Copy above the button:** *"You're granting ObraMarket permission to transfer this piece on
  your behalf if it sells. You keep it in your wallet until then."*

**Step 2 of 2 — List**
- **Button style:** solid fill `primary`, text `bg`.
- **Icon:** a small price-tag/plinth glyph.
- **Label:** `Step 2 of 2 — List`
- **Copy above the button:** *"Listing sets [price] CHU as the asking price. You can cancel
  anytime before it sells."*
- **Motion:** same pulse-only-while-pending rule.

### General transaction states (any tx, across all three flows)

| State | Color | Icon | Motion | Copy pattern |
|---|---|---|---|---|
| Pending | `primary` (vermilion) | Spinner (indeterminate) | Animated spin/pulse | "Confirming on-chain…" — never a fake percentage |
| Confirmed | `secondary` (jade) | Checkmark | One quiet scale-in (0.9→1), no confetti/bursts | State the concrete result: "Confirmed — Obra #042 minted." / "Confirmed — Obra #017 acquired for 40 CHU." / "Confirmed — Obra #017 listed for 45 CHU." |
| Error | `error` (crimson-rose) | Triangle/exclamation | None — errors need to be read, not animated | Name what happened: "Rejected in wallet" vs. "Transaction failed on-chain" vs. "Insufficient CHU balance" — never a bare "Error." |

**Color is never the only signal** — every state above pairs color with an icon *and* a text
label, same accessibility rule as CHU, doubly important here since `border` is intentionally
low-contrast (§3).

### Network badge — always visible

The project spec requires the active network be identifiable at all times, not only inside a
transaction modal. Implementation rule: a persistent pill badge lives in the header/nav chrome
on every screen (mint, marketplace, profile) — never something that only appears during a
wallet-connect or transaction flow.

- **Style:** `surface` fill, `border`-colored 1px outline, the chain's own recognizable mark
  (Ethereum diamond / BNB diamond) at small scale + chain name in Fragment Mono uppercase.
- **Color:** deliberately **neutral** (`ink`/`muted`/`border` only) — the network badge must
  never borrow `primary`/`secondary`/`error`, because those three hues are already reserved for
  transaction state (§ above). Reusing an accent color for network identity would risk exactly
  the "pending vs. error blur" problem this system works hard to avoid elsewhere — a badge that
  happened to render in `error`-adjacent crimson would look like something had failed.
- **Placement:** header, persistent across mint/marketplace/profile — not a modal-only element.

---

## 7. Do's and Don'ts

### Do
- **Do** keep the dark-first, flat-surface-plus-frame-and-mat depth model — no box-shadows
  anywhere in this system, same as both siblings.
- **Do** hold every text/background and text/fill pairing to the verified ratios in §3.
- **Do** treat every approve-step and its paired action-step as materially distinct button
  treatments (outline vs. filled, icon swap, stepper) across all three flows in §6 — never one
  button silently repurposed.
- **Do** pair every color-coded state with a redundant icon + text signal, never color alone.
- **Do** keep the Spanish trait vocabulary (Composición, Paleta, Densidad, Acabado, Sello)
  untranslated in every surface — UI, metadata, README.
- **Do** reserve Price readout (Fraunces, tabular figures) for singular hero price moments only,
  and Label (Fragment Mono) for every repeated/in-grid price — see §4.
- **Do** stamp the seal (§8) in the lower-right corner of every generated NFT plate — it's not
  optional per-piece branding, it's the mark that signs the work.

### Don't
- **Don't** reuse either sibling's hues, accent pairs, or exact typefaces — see the distinctness
  table in §2. OBRA is a family member, not a reskin of CHU or the portfolio.
- **Don't** default to the generic NFT-drop look — no holographic gradient cards, no rarity-score
  "power level" bars, no spinning-3D-preview gimmicks. That cliché is as much a trap here as the
  "dark-hacker-terminal" cliché is for the portfolio site and the "DeFi neon dashboard" cliché is
  for CHU.
- **Don't** give Fragment Mono a headline or a paragraph — labels, data, and chrome only, even
  for its expanded in-grid-price role.
- **Don't** enable Fraunces's `WONK` axis or push `SOFT` high — it reads playful/handwritten,
  wrong register for this system's quieter gallery voice.
- **Don't** put `ink` (white) text directly on an unmodified `primary`/`secondary`/`error` fill
  — see the text-on-fill table in §3, contrast fails.
- **Don't** let the network badge borrow a transaction-state accent color — it must stay neutral
  (`ink`/`muted`/`border`) so it never gets misread as a pending/error signal.
- **Don't** nickname individual pieces cutesy names in UI chrome (no "Obrita #4") — call them
  "Obra #4" or "Piece #4," consistent with the gallery register in §5.
- **Don't** imply a reveal mechanic, hidden traits, or "might be rarer than shown" language — the
  project spec explicitly excludes reveal mechanics; a minted piece's traits are final and known.

---

## 8. Logo Concept

**The mark:** an artist's seal — a chop. A vermilion rounded-square stamp (not a circle: a
chop reads as a *stamp*, not a badge or coin) enclosing a single continuous stroke that
abstracts an "O" — drawn as roughly 325° of a ring, deliberately left slightly open — with the
line continuing past the opening into a signature-flourish tail that curls off toward the
lower right, like the last stroke of a hand signature trailing off the page. The ring
reads as the collection's initial; the tail reads as a signature, not decoration — together
they say "this was made and signed," which is the entire concept of the collection in one mark.

Rendered as vermilion (`primary`, `#f5642b`) fill for the stamp square, with the ring+tail
stroke in `bg` (`#000d06`) — a **knocked-out negative-space stroke**, not a lighter line drawn
on top. This was a deliberate contrast choice, not just an aesthetic one: `bg`-on-`primary`
measures 6.36:1 (§3), far stronger than `ink`-on-`primary` would (2.88:1, fails outright) — the
mark is more legible at every size specifically *because* it reads as carved-out rather than
drawn-on-top, which also happens to be a more honest metaphor for what a physical chop actually
does to paper.

**Scaling behavior:** the full mark (stamp + ring + tail) is used in `seal.svg` and `logo.svg`,
where there's room for the tail's character. At favicon size (16-32px) the tail is dropped
entirely — `favicon.svg` uses a simplified variant (stamp square + a plain closed ring, no
flourish) because the tail's fine curls would just read as noise at that size. This is a
designed degradation, not a missing feature: "the chop outline + stroke survive; the tail
simplifies out at small sizes."

**On every NFT.** A small instance of the full seal (with tail) is stamped in the lower-right
corner of every piece `/contracts/art/generate.ts` renders — see §6's "Do" list. The seal
varies by the Sello trait: standard pieces get the vermilion seal exactly as described above;
rare pieces (~9%) get the same mark in `gold`; ultra-rare pieces (~1%, "signed twice") get two
overlapping, counter-rotated stamps — one vermilion, one gold. This is the mark literally
signing every piece it appears on, at whatever rarity tier that piece happens to be.

**Lockup:** seal + "OBRA" wordmark in Fraunces 600, `ink`-white, set to the right of the mark
at roughly the mark's cap-height (`logo.svg`). The seal can stand alone (favicon, small UI
badges, loading states, and — per above — every NFT's corner stamp); the wordmark should not
appear without the seal in first-impression contexts (README hero, live-demo header, the OG
card) but may appear alone in dense UI chrome (footers, inline mentions) via `wordmark.svg`.

**Regeneration note:** the current SVGs (`logo.svg`, `wordmark.svg`, `og-image.svg`) use live
`<text>` elements referencing Fraunces / Instrument Sans / Fragment Mono rather than outlined
vector paths — same tradeoff CHU's assets made: smaller, more editable files, at the cost of
needing the referenced font loaded to render as intended (falls back to a generic
serif/sans-serif/monospace otherwise). `seal.svg` and `favicon.svg` are pure vector path/shape
data with **no font dependency** and always render correctly regardless of font loading — as
does the seal instance `generate.ts` inlines into every NFT (it uses the exact same
`SEAL_SQUARE` / `SEAL_RING_TAIL_D` constants as `seal.svg`'s path data, kept in sync manually;
if the seal's geometry ever changes, update both places). If regenerating the text-based assets
later for a context that can't load web fonts (print, an environment without Google Fonts
access), either outline the text to paths or rebuild from the concept description above.

---

## 9. Assets Reference

All in `/brand/assets/`:

| File | Purpose |
|---|---|
| `logo.svg` | Primary lockup — seal + "OBRA" wordmark, for headers, README, live-demo hero |
| `wordmark.svg` | Text-only mark, for contexts where the seal appears separately or isn't needed |
| `favicon.svg` | Simplified seal (tail dropped) on a rounded viridian square, legible at 16-32px |
| `og-image.svg` | 1200×630 static social-share card — dark viridian ground, seal, wordmark, brand-line tagline. SVG now; a build step can rasterize to PNG later |
| `seal.svg` | Standalone full seal mark (with tail) — reused unmodified in `logo.svg` and inlined (same path data) into every generated NFT via `/contracts/art/generate.ts` |
| `palette.json` | Machine-readable copy of the color tables in §3 (core + extended art palette), verified contrast, text-on-fill map, and font names |

Related, outside `/brand/` but built directly from this document:

| File | Purpose |
|---|---|
| `/contracts/art/traits.json` | The 5 trait dimensions (§ collection concept) with exact weighted value lists — single source of truth for both the art generator and the frontend's trait-display UI |
| `/contracts/art/generate.ts` | Deterministic SVG generator implementing the collection concept — dark viridian mat, frame, geometric composition per trait, seal stamp per Sello |
| `/contracts/art/preview.md` + `/contracts/art/preview-sheet.svg` | A 9-piece representative preview of the generator's output, for the mint page's preview requirement and README screenshots |

---

**Brand Guardian** — OBRA brand identity, v1.0
**Date:** 2026-07-15
**Status:** Complete — ready for frontend and art-generator implementation. No further creative
input required to build against this document.
