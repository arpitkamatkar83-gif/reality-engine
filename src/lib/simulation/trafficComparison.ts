import { throughputDirection, type ComparisonRow } from "@/lib/comparison";
import { ENVIRONMENTS } from "@/lib/environments";
import { ROAD_IDS, type RoadId, type RoadStats, type TrafficResult } from "./traffic";

export const ROAD_LABEL: Record<RoadId, string> = { main: "Main road", cross: "Cross street" };

const ROAD_METRICS: { key: keyof RoadStats; label: string; unit: string; better: ComparisonRow["better"]; scale?: number }[] = [
  { key: "avgWaitSec", label: "Average waiting time", unit: "s", better: "lower" },
  { key: "maxQueue", label: "Maximum queue", unit: "vehicles", better: "lower" },
  { key: "served", label: "Vehicles served", unit: "vehicles", better: "higher" },
  { key: "saturation", label: "Demand vs capacity", unit: "%", better: "lower", scale: 100 },
];

/** Builds baseline-vs-proposed rows: headline metrics first, then each road. */
export function trafficComparisonRows(baseline: TrafficResult, proposed: TrafficResult): ComparisonRow[] {
  const demandChanged =
    baseline.params.mainArrivalsPerMin !== proposed.params.mainArrivalsPerMin ||
    baseline.params.crossArrivalsPerMin !== proposed.params.crossArrivalsPerMin;
  const direction = (key: string, better: ComparisonRow["better"]) =>
    key === "served" || key === "vehiclesServed" ? throughputDirection(demandChanged) : better;

  const overall: ComparisonRow[] = ENVIRONMENTS.traffic.metrics.map((m) => ({
    ...m,
    better: direction(m.key, m.better),
    group: "Whole intersection",
    before: baseline.summary[m.key as keyof TrafficResult["summary"]],
    after: proposed.summary[m.key as keyof TrafficResult["summary"]],
  }));

  const perRoad = ROAD_IDS.flatMap((road) =>
    ROAD_METRICS.map((m) => ({
      key: `${road}.${m.key}`,
      label: m.label,
      unit: m.unit,
      better: direction(m.key, m.better),
      group: ROAD_LABEL[road],
      before: Math.round(baseline.roads[road][m.key] * (m.scale ?? 1) * 10) / 10,
      after: Math.round(proposed.roads[road][m.key] * (m.scale ?? 1) * 10) / 10,
    })),
  );

  return [...overall, ...perRoad];
}
