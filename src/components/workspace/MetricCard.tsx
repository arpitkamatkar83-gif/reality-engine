import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "default" | "positive" | "warning" | "negative";
}

const TONE = {
  default: "text-ink-100",
  positive: "text-positive",
  warning: "text-warning",
  negative: "text-negative",
} as const;

export function MetricCard({ label, value, hint, tone = "default" }: Props) {
  return (
    <div className="rounded-xl border border-ink-700/70 bg-ink-950/40 p-3">
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold tabular-nums ${TONE[tone]}`}>{value}</p>
      {hint && <div className="mt-1 text-[11px] text-ink-400">{hint}</div>}
    </div>
  );
}
