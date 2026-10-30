import { describe, expect, it } from "vitest";
import { verdict } from "@/lib/comparison";
import { DEFAULT_HOSPITAL_PARAMS } from "@/lib/environments";
import { simulateHospital } from "./hospital";
import { hospitalComparisonRows } from "./hospitalComparison";

describe("hospitalComparisonRows", () => {
  const baseline = simulateHospital(DEFAULT_HOSPITAL_PARAMS);
  const sixDoctors = simulateHospital({ ...DEFAULT_HOSPITAL_PARAMS, doctors: 6 });
  const rows = hospitalComparisonRows(baseline, sixDoctors);
  const row = (key: string) => rows.find((r) => r.key === key)!;

  it("reports values straight from the two results", () => {
    expect(row("avgWaitMin").before).toBe(baseline.summary.avgWaitMin);
    expect(row("avgWaitMin").after).toBe(sixDoctors.summary.avgWaitMin);
    expect(row("doctorCapacityPerHour").after).toBe(sixDoctors.capacity.doctorCapacityPerHour);
    expect(row("stillWaiting").before).toBe(baseline.stats.stillWaiting);
    expect(row("load").after).toBe(Math.round(sixDoctors.capacity.load * 100));
  });

  it("more doctors: shorter waits, unchanged bed capacity", () => {
    expect(verdict(row("avgWaitMin"))).toBe("improved");
    expect(verdict(row("doctorCapacityPerHour"))).toBe("improved");
    expect(verdict(row("bedCapacityPerHour"))).toBe("unchanged");
  });

  it("utilization is reported as changed, never as better or worse", () => {
    expect(verdict(row("doctorUtilization"))).toBe("changed");
  });

  it("treats more patients treated as an improvement only when demand is unchanged", () => {
    expect(row("patientsTreated").better).toBe("higher");
    const busier = simulateHospital({ ...DEFAULT_HOSPITAL_PARAMS, arrivalsPerHour: 14 });
    const treated = hospitalComparisonRows(baseline, busier).find((r) => r.key === "patientsTreated")!;
    expect(treated.better).toBe("neutral");
  });

  it("marks identical scenarios as unchanged", () => {
    for (const r of hospitalComparisonRows(baseline, baseline)) expect(verdict(r)).toBe("unchanged");
  });
});
