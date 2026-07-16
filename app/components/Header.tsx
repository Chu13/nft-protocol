"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { SealIcon } from "./ui/icons";
import { NetworkSelector } from "./NetworkSelector";
import { WalletConnectButton } from "./WalletConnectButton";

const NAV_LINK_CLASSES = "font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150";

// Same path data as SealIcon's ring+tail stroke (app/components/ui/icons.tsx)
// — reused here as a standalone stroke-dasharray animation target, not
// imported, since SealIcon renders it as a filled/stroked icon, not a
// pathLength-based stroke-draw animation.
const SEAL_STROKE_D = "M 62.55 57.22 A 19 19 0 1 1 66.93 46.66 C 76 52 82 62 78 72 C 75.5 78 68 80 62 76";
const SIGNATURE_CLICK_THRESHOLD = 5;
const SIGNATURE_WINDOW_MS = 2000;

/**
 * Seal mark rendered as inline vector (font-independent, always correct) +
 * "OBRA" set as real DOM text in Fraunces via the page's loaded webfont —
 * rather than embedding the brand SVG's live <text> element, which per
 * BRAND.md's own regeneration note only renders correctly where that font
 * happens to be loaded inside the SVG's own scope. This gets the same
 * lockup with a guaranteed-correct font.
 */
export function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  const profileHref = isConnected && address ? `/profile/${address}` : undefined;

  const clickCountRef = useRef(0);
  const windowStartRef = useRef(0);
  const [signing, setSigning] = useState(false);

  function handleSealClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (signing) return;

    const now = Date.now();
    if (now - windowStartRef.current > SIGNATURE_WINDOW_MS) {
      windowStartRef.current = now;
      clickCountRef.current = 0;
    }
    clickCountRef.current += 1;

    if (clickCountRef.current >= SIGNATURE_CLICK_THRESHOLD) {
      clickCountRef.current = 0;
      setSigning(true);
    }
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center justify-between gap-4 lg:justify-start">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSealClick}
              className="relative flex h-7 w-7 items-center justify-center"
              aria-label="OBRA seal"
            >
              <SealIcon className="h-7 w-7 text-primary" />
              {signing && (
                <svg
                  viewBox="0 0 100 100"
                  className="pointer-events-none absolute inset-0 h-7 w-7"
                  aria-hidden="true"
                >
                  <path
                    d={SEAL_STROKE_D}
                    fill="none"
                    stroke="var(--color-ink)"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={1}
                    className="animate-sign"
                    onAnimationEnd={() => setSigning(false)}
                  />
                </svg>
              )}
            </button>
            <Link href="/" className="flex flex-col">
              <span className="font-display text-2xl font-semibold leading-none text-ink">OBRA</span>
              <span className="font-body text-xs text-muted">Mint, list, collect — all in CHU.</span>
            </Link>
          </div>
          <div className="lg:hidden">
            <WalletConnectButton />
          </div>
        </div>

        <nav className="flex items-center gap-5">
          <NavLink href="/" active={pathname === "/"}>
            Mint
          </NavLink>
          <NavLink href="/marketplace" active={pathname?.startsWith("/marketplace") ?? false}>
            Marketplace
          </NavLink>
          <NavLink href="/how-it-works" active={pathname === "/how-it-works"}>
            How it works
          </NavLink>
          {profileHref && (
            <NavLink href={profileHref} active={pathname?.startsWith("/profile") ?? false}>
              My Pieces
            </NavLink>
          )}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-4">
          <NetworkSelector />
          <div className="hidden lg:block">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={[NAV_LINK_CLASSES, active ? "text-primary" : "text-muted hover:text-ink"].join(" ")}>
      {children}
    </Link>
  );
}
