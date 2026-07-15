import { CheckIcon } from "./ui/icons";

export type StepState = "upcoming" | "active" | "complete";

interface StepIndicatorProps {
  step1State: StepState;
  step2State: StepState;
  step1Label: string;
  step2Label: string;
}

/**
 * The persistent 2-node stepper prescribed in BRAND.md §6 for all three
 * approve -> action flows (mint, buy, list): sits above the action button
 * for the duration of the flow, first node filled/active in `primary`
 * during step 1 (outlined in `muted` for step 2 while upcoming), then step 1
 * shows complete (checkmark) and step 2 becomes active in `primary`.
 *
 * The connector fills `border` -> `secondary` once step 1 completes, and
 * its checkmark plays one `animate-scale-in` on arrival — the brand's own
 * sanctioned "one quiet scale-in for confirmed" applied to the product's
 * riskiest UX moments.
 */
export function StepIndicator({ step1State, step2State, step1Label, step2Label }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.08em]" aria-hidden={false}>
      <StepNode state={step1State} label={step1Label} index={1} />
      <span
        className={[
          "h-px w-6 shrink-0 transition-colors duration-300",
          step1State === "complete" ? "bg-secondary" : "bg-border",
        ].join(" ")}
      />
      <StepNode state={step2State} label={step2Label} index={2} />
    </div>
  );
}

function StepNode({ state, label, index }: { state: StepState; label: string; index: number }) {
  const dotClasses =
    state === "complete"
      ? "border-secondary bg-secondary text-bg"
      : state === "active"
        ? "border-primary bg-primary text-bg"
        : "border-muted bg-transparent text-muted";

  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${dotClasses}`}
      >
        {state === "complete" ? <CheckIcon className="h-3 w-3 animate-scale-in" /> : index}
      </span>
      <span className={state === "upcoming" ? "text-muted" : "text-ink"}>{label}</span>
    </span>
  );
}
