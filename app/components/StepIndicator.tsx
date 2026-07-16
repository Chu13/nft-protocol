import { CheckIcon } from "./ui/icons";

export type StepState = "upcoming" | "active" | "complete";

interface StepIndicatorProps {
  step1State: StepState;
  step2State: StepState;
  step1Label: string;
  step2Label: string;
}

export function StepIndicator({ step1State, step2State, step1Label, step2Label }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.08em]" aria-hidden={false}>
      <StepNode state={step1State} label={step1Label} index={1} />
      <span className="relative h-px w-6 shrink-0 overflow-hidden bg-border">
        <span
          className={[
            "absolute inset-0 origin-left bg-secondary transition-transform duration-300 ease-out",
            step1State === "complete" ? "scale-x-100" : "scale-x-0",
          ].join(" ")}
        />
      </span>
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
