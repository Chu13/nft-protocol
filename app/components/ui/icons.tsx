import type { SVGProps } from "react";

/**
 * Small stroke-based icon set used throughout the app. Deliberately simple/
 * geometric — no filled illustrative icons — consistent with the flat,
 * restrained surface language in BRAND.md.
 *
 * Icon assignment follows BRAND.md §6's "icon convention across flows"
 * exactly: KeyIcon is reused for BOTH CHU-approval steps (Mint flow step 1,
 * Buy flow step 1) since it's the same underlying action; TagLockIcon is
 * used ONLY for the NFT-approval step (List flow step 1) so a user can never
 * mistake "approving my token spend" for "approving my NFT to be
 * transferable." Step-2 icons are distinct per flow: SealIcon (mint),
 * FrameIcon (acquire), PriceTagIcon (list).
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

/** Key/unlock glyph — approving CHU (ERC-20), reused across the Mint and Buy flows' Step 1. */
export function KeyIcon(props: IconProps) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3" />
      <path d="M16 7l2 2" />
      <path d="M13 10l2 2" />
    </svg>
  );
}

/** Tag with a small lock — approving the NFT itself (List flow's Step 1 only). */
export function TagLockIcon(props: IconProps) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <path d="M3 11.5 11.5 3H19a2 2 0 0 1 2 2v7.5L12.5 21 3 11.5Z" />
      <circle cx="14" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <rect x="15.5" y="14" width="6" height="5" rx="1" />
      <path d="M16.7 14v-1.5a1.8 1.8 0 0 1 3.6 0V14" />
    </svg>
  );
}

/** The OBRA seal mark — vermilion chop with ring + signature tail. Step 2 icon for Mint. */
export function SealIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 100 100" width={18} height={18} {...props}>
      <rect x="8" y="8" width="84" height="84" rx="14" fill="currentColor" />
      <path
        d="M 62.55 57.22 A 19 19 0 1 1 66.93 46.66 C 76 52 82 62 78 72 C 75.5 78 68 80 62 76"
        fill="none"
        stroke="var(--color-bg)"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A piece sliding into a frame outline — Step 2 icon for Acquire (buy), distinct from Mint's seal. */
export function FrameIcon(props: IconProps) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <rect x="4" y="4" width="13" height="16" rx="1.5" />
      <path d="M8 10.5h5" />
      <path d="M8 14h3.5" />
      <path d="M17.5 8 21 8" />
      <path d="M17.5 16 21 16" />
      <path d="M19 6v12" />
    </svg>
  );
}

/** A small price-tag on a plinth — Step 2 icon for List. */
export function PriceTagIcon(props: IconProps) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <path d="M12.5 3.5 20 11 12 19l-7.5-7.5V4h7.5Z" />
      <circle cx="9" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M3 20h9" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M5 12.5 9.5 17 19 6.5" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M10.3 4.4 2.9 18a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.7 4.4a1.6 1.6 0 0 0-2.8 0Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} strokeWidth={2.5} {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} width={14} height={14} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14h2" />
      <path d="M7 6V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

/** Two overlapping squares — copy to clipboard. */
export function CopyIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

/** Box with an arrow escaping the top-right corner — opens in a new tab / external link. */
export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  );
}

/** Small grid glyph — the mint page's "browse the marketplace" link, and empty-state prompts. */
export function GridIcon(props: IconProps) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  );
}

/** Small user/profile glyph. */
export function UserIcon(props: IconProps) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** Sort/arrows glyph — marketplace price sort control. */
export function SortIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M7 4v16" />
      <path d="M3.5 7.5 7 4l3.5 3.5" />
      <path d="M17 20V4" />
      <path d="M13.5 16.5 17 20l3.5-3.5" />
    </svg>
  );
}

/** Speaker with sound waves — the footer sound toggle's "on" state. */
export function SpeakerIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

/** Speaker with an X — the footer sound toggle's "off" (default) state. */
export function SpeakerMuteIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 9.5 21.5 14" />
      <path d="M21.5 9.5 17 14" />
    </svg>
  );
}
