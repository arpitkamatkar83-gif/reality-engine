import { describe, expect, it } from "vitest";
import { verdict } from "@/lib/comparison";
import { DEFAULT_TRAFFIC_PARAMS } from "@/lib/environments";
import { simulateTraffic } from "./traffic";
import { trafficComparisonRows } from "./trafficComparison";

describe("trafficComparisonRows", () => {
  const baseline = simulateTraffic(DEFAULT_TRAFFIC_PARAMS);
  const proposed = simulateTraffic({ ...DEFAULT_TRAFFIC_PARAMS, mainGreenSec: 50 });
  const rows = trafficComparisonRows(baseline, proposed);
  const row = (key: string) => rows.find((r) => r.key === key)!;

  it("reports values straight from the two results", () => {
    expect(row("avgWaitSec").before).toBe(baseline.summary.avgWaitSec);
    expect(row("avgWaitSec").after).toBe(proposed.summary.avgWaitSec);
    expect(row("cross.avgWaitSec").after).toBe(proposed.roads.cross.avgWaitSec);
    expect(row("main.saturation").before).toBe(Math.round(baseline.roads.main.saturation * 1000) / 10);
  });

  it("shows trade-offs rather than assuming improvement", () => {
    expect(verdict(row("main.avgWaitSec"))).toBe("improved");
    expect(verdict(row("cross.avgWaitSec"))).toBe("worse");
  });

  it("does not call higher throughput an improvement when demand changed", () => {
    const busier = simulateTraffic({ ...DEFAULT_TRAFFIC_PARAMS, mainArrivalsPerMin: 25 });
    const served = trafficComparisonRows(baseline, busier).find((r) => r.key === "vehiclesServed")!;
    expect(served.after).toBeGreaterThan(served.before);
    expect(verdict(served)).toBe("changed");
    expect(row("vehiclesServed").better).toBe("higher"); // same demand: still a real improvement
  });

  it("marks identical scenarios as unchanged", () => {
    for (const r of trafficComparisonRows(baseline, baseline)) expect(verdict(r)).toBe("unchanged");
  });
});

describe("verdict", () => {
  it("respects metric direction", () => {
    expect(verdict({ before: 10, after: 5, better: "lower" })).toBe("improved");
    expect(verdict({ before: 10, after: 5, better: "higher" })).toBe("worse");
    expect(verdict({ before: 10, after: 15, better: "neutral" })).toBe("changed");
  });
});
