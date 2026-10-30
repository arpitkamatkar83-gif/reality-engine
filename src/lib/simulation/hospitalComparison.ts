import { throughputDirection, type ComparisonRow } from "@/lib/comparison";
import { ENVIRONMENTS } from "@/lib/environments";
import type { HospitalResult } from "./hospital";

/** Builds baseline-vs-proposed rows: headline metrics, then capacity and backlog. */
export function hospitalComparisonRows(baseline: HospitalResult, proposed: HospitalResult): ComparisonRow[] {
  const demandChanged = baseline.params.arrivalsPerHour !== proposed.params.arrivalsPerHour;

  const headline: ComparisonRow[] = ENVIRONMENTS.hospital.metrics.map((m) => ({
    ...m,
    better: m.key === "patientsTreated" ? throughputDirection(demandChanged) : m.better,
    group: "Emergency department",
    before: baseline.summary[m.key as keyof HospitalResult["summary"]],
    after: proposed.summary[m.key as keyof HospitalResult["summary"]],
  }));

  const capacity: ComparisonRow[] = [
    {
      key: "doctorCapacityPerHour",
      label: "Doctor capacity",
      unit: "patients/h",
      better: "higher",
      before: baseline.capacity.doctorCapacityPerHour,
      after: proposed.capacity.doctorCapacityPerHour,
    },
    {
      key: "bedCapacityPerHour",
      label: "Bed capacity",
      unit: "patients/h",
      better: "higher",
      before: baseline.capacity.bedCapacityPerHour,
      after: proposed.capacity.bedCapacityPerHour,
    },
    {
      key: "load",
      label: "Demand vs bottleneck capacity",
      unit: "%",
      better: "lower",
      before: Math.round(baseline.capacity.load * 100),
      after: Math.round(proposed.capacity.load * 100),
    },
    {
      key: "stillWaiting",
      label: "Still waiting at end of window",
      unit: "patients",
      better: "lower",
      before: baseline.stats.stillWaiting,
      after: proposed.stats.stillWaiting,
    },
    {
      key: "maxWaitMin",
      label: "Longest wait",
      unit: "min",
      better: "lower",
      before: baseline.stats.maxWaitMin,
      after: proposed.stats.maxWaitMin,
    },
  ].map((r) => ({ ...r, group: "Capacity and backlog" }) as ComparisonRow);

  return [...headline, ...capacity];
}
