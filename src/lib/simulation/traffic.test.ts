import { describe, expect, it } from "vitest";
import { DEFAULT_TRAFFIC_PARAMS, ENVIRONMENTS, type TrafficParams } from "@/lib/environments";
import { phaseAt, simulateTraffic, TRAFFIC_MODEL } from "./traffic";

const run = (overrides: Partial<TrafficParams> = {}) => simulateTraffic({ ...DEFAULT_TRAFFIC_PARAMS, ...overrides });

describe("simulateTraffic", () => {
  it("is deterministic: identical inputs give identical results", () => {
    expect(run({ mainGreenSec: 45, crossArrivalsPerMin: 17 })).toEqual(run({ mainGreenSec: 45, crossArrivalsPerMin: 17 }));
  });

  it("produces one frame per simulated second over the default 10-minute period", () => {
    const result = run();
    expect(result.durationSec).toBe(600);
    expect(result.timeline).toHaveLength(600);
    expect(run().timeline.map((f) => f.t)).toEqual([...Array(600).keys()]);
  });

  it("conserves vehicles: arrived = served + still queued", () => {
    const result = run({ mainArrivalsPerMin: 40 });
    for (const road of Object.values(result.roads)) {
      expect(road.arrived).toBe(road.served + road.remainingQueue);
    }
    expect(result.roads.main.arrived).toBe(400);
  });

  it("exposes every metric declared for the traffic environment", () => {
    const summary = run().summary as unknown as Record<string, number>;
    for (const metric of ENVIRONMENTS.traffic.metrics) {
      expect(typeof summary[metric.key]).toBe("number");
    }
  });

  it("increasing demand increases queues and waiting times on that road", () => {
    const base = run();
    const busy = run({ mainArrivalsPerMin: 35 });
    expect(busy.roads.main.avgWaitSec).toBeGreaterThan(base.roads.main.avgWaitSec);
    expect(busy.roads.main.maxQueue).toBeGreaterThan(base.roads.main.maxQueue);
    expect(busy.summary.congestion).toBeGreaterThan(base.summary.congestion);
    // The cross street is untouched.
    expect(busy.roads.cross).toEqual(base.roads.cross);
  });

  it("longer main green helps the main road but hurts the cross street", () => {
    const base = run();
    const longer = run({ mainGreenSec: 50 });
    expect(longer.cycleSec).toBe(50 + 30 + 2 * TRAFFIC_MODEL.clearanceSec);
    expect(longer.roads.main.avgWaitSec).toBeLessThan(base.roads.main.avgWaitSec);
    expect(longer.roads.main.capacityPerMin).toBeGreaterThan(base.roads.main.capacityPerMin);
    expect(longer.roads.cross.avgWaitSec).toBeGreaterThan(base.roads.cross.avgWaitSec);
    expect(longer.roads.cross.capacityPerMin).toBeLessThan(base.roads.cross.capacityPerMin);
  });

  it("more lanes increase capacity and reduce waiting", () => {
    const base = run({ mainArrivalsPerMin: 35 });
    const wider = run({ mainArrivalsPerMin: 35, lanesPerApproach: 2 });
    expect(wider.roads.main.capacityPerMin).toBeCloseTo(base.roads.main.capacityPerMin * 2, 0);
    expect(wider.roads.main.avgWaitSec).toBeLessThan(base.roads.main.avgWaitSec);
  });

  it("flags oversaturation when demand exceeds capacity", () => {
    const result = run({ mainArrivalsPerMin: 45 });
    expect(result.roads.main.saturation).toBeGreaterThan(1);
    expect(result.congestionLevel).toBe("Oversaturated");
    expect(result.roads.main.remainingQueue).toBeGreaterThan(100);
  });

  it("only discharges a road during its own green, within lane capacity", () => {
    const params = { ...DEFAULT_TRAFFIC_PARAMS, lanesPerApproach: 2, mainArrivalsPerMin: 50 };
    const result = simulateTraffic(params);
    const perSec = (params.lanesPerApproach * TRAFFIC_MODEL.directionsPerRoad) / TRAFFIC_MODEL.saturationHeadwaySec;
    for (const frame of result.timeline) {
      if (frame.phase !== "mainGreen") expect(frame.served.main).toBe(0);
      if (frame.phase !== "crossGreen") expect(frame.served.cross).toBe(0);
      expect(frame.served.main).toBeLessThanOrEqual(perSec);
      expect(frame.served.cross).toBeLessThanOrEqual(perSec);
    }
  });

  it("follows the configured signal cycle", () => {
    const p = { ...DEFAULT_TRAFFIC_PARAMS, mainGreenSec: 40, crossGreenSec: 20 };
    expect(phaseAt(0, p).phase).toBe("mainGreen");
    expect(phaseAt(39, p).phase).toBe("mainGreen");
    expect(phaseAt(40, p).phase).toBe("mainClearance");
    expect(phaseAt(44, p).phase).toBe("crossGreen");
    expect(phaseAt(64, p).phase).toBe("crossClearance");
    expect(phaseAt(68, p).phase).toBe("mainGreen");
  });

  it("rejects invalid parameters", () => {
    expect(() => run({ mainGreenSec: 5 })).toThrow();
    expect(() => run({ lanesPerApproach: 1.5 })).toThrow();
    expect(() => run({ mainArrivalsPerMin: Number.NaN })).toThrow();
    expect(() => simulateTraffic({ ...DEFAULT_TRAFFIC_PARAMS }, { durationSec: 10 })).toThrow(RangeError);
  });

  it("supports a configurable duration", () => {
    expect(simulateTraffic(DEFAULT_TRAFFIC_PARAMS, { durationSec: 1200 }).timeline).toHaveLength(1200);
  });
});
