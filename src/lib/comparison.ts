import type { MetricDirection } from "./environments";

export interface ComparisonRow {
  key: string;
  label: string;
  unit: string;
  better: MetricDirection;
  before: number;
  after: number;
  group?: string;
}

export type Verdict = "improved" | "worse" | "unchanged" | "changed";

/** Classifies a metric change; "neutral" metrics are reported as changed, never as better or worse. */
export function verdict(row: Pick<ComparisonRow, "before" | "after" | "better">): Verdict {
  const diff = row.after - row.before;
  if (Math.abs(diff) < 0.05) return "unchanged";
  if (row.better === "neutral") return "changed";
  return (diff < 0) === (row.better === "lower") ? "improved" : "worse";
}

/**
 * Throughput (vehicles served, patients treated) only means "better" when demand is
 * the same in both scenarios; otherwise more output may just reflect more arrivals.
 */
export function throughputDirection(demandChanged: boolean): MetricDirection {
  return demandChanged ? "neutral" : "higher";
}
