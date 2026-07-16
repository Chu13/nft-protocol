"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangleIcon, CheckIcon, SpinnerIcon } from "./ui/icons";

export type TxToastPhase = "pending" | "confirmed" | "error";

interface NotifyOptions {
  /** Overrides the phase's default icon — used by the mint flow to render
   * the seal-stamp treatment (and its rarity styling) instead of the
   * generic confirmed checkmark. Omit for the default icon. */
  icon?: ReactNode;
}

interface ToastItem {
  id: number;
  phase: TxToastPhase;
  message: string;
  icon?: ReactNode;
}

interface ToastContextValue {
  /** Push a transaction status toast. Returns the toast id (for manual dismissal, e.g. pending -> confirmed replace). */
  notify: (phase: TxToastPhase, message: string, options?: NotifyOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

// Confirmed toasts clear themselves after a few seconds; pending toasts are
// dismissed explicitly by the caller once the tx resolves. Errors are never
// auto-dismissed — BRAND.md: "errors need to be read, not animated."
const AUTO_DISMISS_MS: Record<TxToastPhase, number | null> = {
  pending: null,
  confirmed: 5000,
  error: null,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (phase: TxToastPhase, message: string, options?: NotifyOptions) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, phase, message, icon: options?.icon }]);
      const duration = AUTO_DISMISS_MS[phase];
      if (duration) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useTxToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useTxToast must be used within a ToastProvider");
  return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      data-testid="toast-viewport"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((t) => (
        <TxStatusToast key={t.id} phase={t.phase} message={t.message} icon={t.icon} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const PHASE_BORDER: Record<TxToastPhase, string> = {
  pending: "border-primary/50",
  confirmed: "border-secondary/50",
  error: "border-error/50",
};

interface TxStatusToastProps {
  phase: TxToastPhase;
  message: string;
  icon?: ReactNode;
  onDismiss?: () => void;
}

/**
 * Single transaction-status toast — pending / confirmed / error, per
 * BRAND.md §6. Color is never the only signal: every state pairs an icon
 * with a plain-language message. No box-shadow (flat-surface rule); the
 * confirmed state gets one quiet scale-in, never a celebratory motion.
 */
export function TxStatusToast({ phase, message, icon, onDismiss }: TxStatusToastProps) {
  return (
    <div
      role={phase === "error" ? "alert" : "status"}
      className={[
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-high px-4 py-3",
        PHASE_BORDER[phase],
        phase === "confirmed" ? "animate-scale-in" : "",
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0">
        {icon
          ? icon
          : phase === "pending"
            ? <SpinnerIcon className="h-4 w-4 animate-spin text-primary" />
            : phase === "confirmed"
              ? <CheckIcon className="h-4 w-4 text-secondary" />
              : <AlertTriangleIcon className="h-4 w-4 text-error" />}
      </span>
      <p className="font-body text-sm leading-snug text-ink">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="ml-auto shrink-0 font-mono text-xs text-muted transition-colors hover:text-ink"
        >
          ✕
        </button>
      )}
    </div>
  );
}
