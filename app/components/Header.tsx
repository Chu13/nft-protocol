"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { SealIcon } from "./ui/icons";
import { NetworkSelector } from "./NetworkSelector";
import { WalletConnectButton } from "./WalletConnectButton";

const NAV_LINK_CLASSES = "font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150";

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

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center justify-between gap-4 lg:justify-start">
          <Link href="/" className="flex items-center gap-3">
            <SealIcon className="h-7 w-7 text-primary" />
            <div className="flex flex-col">
              <span className="font-display text-2xl font-semibold leading-none text-ink">OBRA</span>
              <span className="font-body text-xs text-muted">Mint, list, collect — all in CHU.</span>
            </div>
          </Link>
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
