import type { ReactNode } from "react";
import type { EnvironmentTheme } from "@/components/dashboard/EnvironmentCard";
import { Card } from "@/components/ui/Card";
import type { ComparisonRow } from "@/lib/comparison";
import { ComparisonTable } from "./ComparisonTable";

interface Props {
  rows: ComparisonRow[] | null;
  isBaselineRun: boolean;
  theme: EnvironmentTheme;
  /** Optional context shown above the table, e.g. a bottleneck shift. */
  note?: ReactNode;
  className?: string;
}

/** Bottom panel comparing the last run against the default-parameter baseline. */
export function ComparisonPanel({ rows, isBaselineRun, theme, note, className = "" }: Props) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`font-mono text-xs uppercase tracking-[0.16em] ${theme.accentText}`}>Before / after</h2>
        <span className="text-xs text-ink-400">Baseline = default values · Proposed = last run</span>
      </div>
      {!rows ? (
        <p className="text-sm text-ink-400">Run a scenario to compare it against the baseline.</p>
      ) : isBaselineRun ? (
        <p className="text-sm text-ink-400">
          This run uses the baseline values. Change one or more parameters and run again to see what changes.
        </p>
      ) : (
        <>
          {note}
          <ComparisonTable rows={rows} />
        </>
      )}
    </Card>
  );
}
