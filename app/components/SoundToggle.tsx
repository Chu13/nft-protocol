"use client";

import { useSyncExternalStore } from "react";
import { SpeakerIcon, SpeakerMuteIcon } from "./ui/icons";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";

// A tiny local external-store subscription so the toggle's on-screen state
// stays in sync with localStorage. useSyncExternalStore (not useState +
// useEffect) is what lets the client's first render read the real
// localStorage value without a hydration mismatch against the server's
// markup — getServerSnapshot always returns the SSR default (off),
// getSnapshot reads the real client value once mounted, and React
// reconciles the difference for us instead of us calling setState in an
// effect body.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot() {
  return false;
}

/**
 * Discrete footer toggle for the mint-confirmation "stamp" sound — default
 * OFF, persisted to localStorage.
 */
export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribe, isSoundEnabled, getServerSnapshot);

  function toggle() {
    setSoundEnabled(!enabled);
    listeners.forEach((listener) => listener());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? "Sound on — mute confirmation sound" : "Sound off — enable confirmation sound"}
      className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
    >
      {enabled ? <SpeakerIcon className="h-3.5 w-3.5" /> : <SpeakerMuteIcon className="h-3.5 w-3.5" />}
      <span className="font-mono text-xs">Sound</span>
    </button>
  );
}
