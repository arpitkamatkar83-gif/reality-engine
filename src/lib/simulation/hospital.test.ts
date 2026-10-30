import { describe, expect, it } from "vitest";
import { DEFAULT_HOSPITAL_PARAMS, ENVIRONMENTS, type HospitalParams } from "@/lib/environments";
import { HOSPITAL_MODEL, hospitalCapacity, simulateHospital } from "./hospital";

const run = (overrides: Partial<HospitalParams> = {}) => simulateHospital({ ...DEFAULT_HOSPITAL_PARAMS, ...overrides });

describe("simulateHospital", () => {
  it("is deterministic: identical inputs give identical results", () => {
    expect(run({ doctors: 5, arrivalsPerHour: 13 })).toEqual(run({ doctors: 5, arrivalsPerHour: 13 }));
  });

  it("covers a 10-hour window with one frame per minute", () => {
    const result = run();
    expect(result.durationMin).toBe(600);
    expect(result.timeline).toHaveLength(600);
    expect(simulateHospital(DEFAULT_HOSPITAL_PARAMS, { durationMin: 120 }).timeline).toHaveLength(120);
  });

  it("generates total arrivals equal to rate × hours (demand profile averages 1.0)", () => {
    const profile = HOSPITAL_MODEL.hourlyDemandProfile;
    expect(profile.reduce((a, b) => a + b, 0) / profile.length).toBeCloseTo(1, 10);
    expect(run({ arrivalsPerHour: 10 }).stats.arrived).toBe(100);
    expect(run({ arrivalsPerHour: 23 }).stats.arrived).toBe(230);
  });

  it("exposes every metric declared for the hospital environment", () => {
    const summary = run().summary as unknown as Record<string, number>;
    for (const metric of ENVIRONMENTS.hospital.metrics) expect(typeof summary[metric.key]).toBe("number");
  });

  it("never uses more doctors or beds than exist", () => {
    const params = { ...DEFAULT_HOSPITAL_PARAMS, arrivalsPerHour: 30, doctors: 3, beds: 5 };
    const result = simulateHospital(params);
    for (const frame of result.timeline) {
      expect(frame.inTreatment).toBeLessThanOrEqual(params.doctors);
      expect(frame.inTreatment + frame.inObservation).toBeLessThanOrEqual(params.beds);
    }
    // No doctor or bed is double-booked at any minute.
    for (let t = 0; t < result.durationMin; t++) {
      const active = result.patients.filter((p) => p.start !== null && p.start <= t);
      const doctors = active.filter((p) => p.treatmentEnd! > t).map((p) => p.doctor);
      const beds = active.filter((p) => p.discharge! > t).map((p) => p.bed);
      expect(new Set(doctors).size).toBe(doctors.length);
      expect(new Set(beds).size).toBe(beds.length);
    }
  });

  it("conserves patients and never starts treatment before arrival", () => {
    const result = run({ arrivalsPerHour: 18 });
    const last = result.timeline.at(-1)!;
    expect(last.waiting + last.inTreatment + last.inObservation + last.discharged).toBe(last.arrived);
    for (const p of result.patients) if (p.start !== null) expect(p.start).toBeGreaterThanOrEqual(p.arrival);
  });

  it("more doctors raise treatment capacity and cut waiting when doctors are the bottleneck", () => {
    const base = run();
    const more = run({ doctors: 6 });
    expect(base.capacity.bottleneck).toBe("doctors");
    expect(more.capacity.doctorCapacityPerHour).toBeGreaterThan(base.capacity.doctorCapacityPerHour);
    expect(more.summary.avgWaitMin).toBeLessThan(base.summary.avgWaitMin);
    expect(more.summary.doctorUtilization).toBeLessThan(base.summary.doctorUtilization);
  });

  it("beds become the bottleneck: extra doctors stop helping, extra beds do", () => {
    const six = run({ doctors: 6 });
    const eight = run({ doctors: 8 });
    expect(six.capacity.bottleneck).toBe("beds");
    expect(six.stats.minutesWaitingForBed).toBeGreaterThan(0);
    expect(eight.summary.avgWaitMin).toBe(six.summary.avgWaitMin);
    const moreBeds = run({ doctors: 6, beds: 16 });
    expect(moreBeds.summary.avgWaitMin).toBeLessThan(six.summary.avgWaitMin);
  });

  it("arrivals beyond capacity build a growing queue", () => {
    const result = run({ arrivalsPerHour: 30 });
    expect(result.capacity.load).toBeGreaterThan(1);
    expect(result.stats.stillWaiting).toBeGreaterThan(100);
    expect(result.summary.maxQueue).toBe(result.stats.stillWaiting);
    expect(result.summary.doctorUtilization).toBeGreaterThan(95);
  });

  it("computes capacity from explicit formulas", () => {
    const cap = hospitalCapacity({ doctors: 4, beds: 12, arrivalsPerHour: 10, treatmentMinutes: 25 });
    expect(cap.doctorCapacityPerHour).toBe(9.6); // 4 × 60 / 25
    expect(cap.bedCapacityPerHour).toBe(10.3); // 12 × 60 / (25 + 45)
    expect(cap.bottleneck).toBe("doctors");
  });

  it("rejects invalid parameters", () => {
    expect(() => run({ doctors: 0 })).toThrow();
    expect(() => run({ beds: 61 })).toThrow();
    expect(() => run({ treatmentMinutes: 12.5 })).toThrow();
    expect(() => simulateHospital(DEFAULT_HOSPITAL_PARAMS, { durationMin: 5 })).toThrow(RangeError);
  });
});
