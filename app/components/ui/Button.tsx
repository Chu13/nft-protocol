"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "filled-primary" | "outline-primary" | "filled-secondary" | "filled-error" | "ghost";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  /** While true, shows the brand's pulse-glow motion — reserved for "something is happening," never idle. */
  pending?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

/*
 * Text-on-fill pairings per BRAND.md §3: `bg` (near-black) text on every
 * filled accent — the one flip in the system is errorDeep (fill-only hover
 * state), which needs `ink` text; that's handled by the hover color alone
 * staying on the `error` base token here, not a separate deep-fill variant.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  "filled-primary": "border border-transparent bg-primary text-bg hover:bg-primary-deep",
  "outline-primary": "border border-primary bg-transparent text-primary hover:bg-primary/10",
  "filled-secondary": "border border-transparent bg-secondary text-bg hover:bg-secondary-deep",
  "filled-error": "border border-transparent bg-error text-bg hover:bg-error-deep",
  ghost: "border border-border bg-transparent text-ink hover:bg-surface-high",
};

export function Button({
  variant = "filled-primary",
  icon,
  pending = false,
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        "relative inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3",
        "font-body text-sm font-semibold sm:text-base",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth ? "w-full" : "",
        VARIANT_CLASSES[variant],
        pending ? "animate-pulse-glow" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || pending}
      aria-busy={pending}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
