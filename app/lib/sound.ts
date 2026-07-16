/**
 * Synthesized UI sound — no audio asset shipped. The one confirmation sound
 * this app plays ("the chop lands") is generated at runtime via the Web
 * Audio API, matching the seal/chop-stamp brand metaphor with a real short
 * thud instead of a bundled binary asset for a single ~150ms cue.
 */

const STORAGE_KEY = "obra:sound";

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    audioContext = new Ctor();
  }
  return audioContext;
}

/**
 * Plays a short (~150ms) synthesized "stamp" thud: a low sine burst (pitch
 * dropping fast, like a chop striking paper) layered with a brief filtered
 * noise burst (the paper/ink texture). Call only from a user-gesture event
 * handler — browser autoplay policy requires it.
 */
export function playStampSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  const duration = 0.15;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.35, now + 0.008);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);

  const noiseBufferSize = Math.ceil(ctx.sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBufferSize; i++) {
    channel[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(800, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

/** Reads the persisted sound preference. Defaults to OFF when unset or during SSR. */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

/** Persists the sound preference (`"1"` on, `"0"` off). */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}
