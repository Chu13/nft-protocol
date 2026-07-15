import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Second elevation step (surface-high) for active/featured cards — no box-shadows, ever. */
  elevated?: boolean;
}

export function Card({ children, className = "", elevated = false }: CardProps) {
  return (
    <div
      className={["rounded-2xl border border-border p-5 sm:p-6", elevated ? "bg-surface-high" : "bg-surface", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
