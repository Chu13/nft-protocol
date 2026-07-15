/**
 * Shared footer for every route. Carries BRAND.md §1's storytelling "brand
 * line" ("Signed by Chu. Paid in CHU.") with "Built by Chu" as a discreet,
 * low-key link out to the rest of the portfolio — muted at rest, only an
 * underline marks it as a link, brightening on hover like the header nav
 * links. No accent color, no icon: on purpose, per BRAND.md §5's
 * "curatorial, not salesy" voice rule.
 */
export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-6 text-center font-mono text-xs text-muted sm:px-6">
      Signed by Chu. Paid in CHU. — OBRA ·{" "}
      <a
        href="https://jabordones.com"
        target="_blank"
        rel="noopener noreferrer"
        title="jabordones.com — Jesus Bordones' portfolio"
        className="text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink hover:decoration-muted"
      >
        Built by Chu
      </a>
    </footer>
  );
}
