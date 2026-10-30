import { TrafficParamsSchema, type TrafficParams } from "@/lib/environments";

/**
 * Simplified fixed-time signalised intersection — an illustrative model, not a
 * traffic-engineering tool.
 *
 * Model assumptions:
 * - Two roads (main, cross), each carrying traffic in two directions. Each road
 *   is modelled as one first-in-first-out queue; arrival rates are road totals.
 * - Arrivals are evenly spaced: vehicle k on a road arrives at (k + 0.5) · 60 / rate
 *   seconds. No randomness, so identical inputs always give identical outputs.
 * - Signal cycle: main green → clearance (yellow + all-red) → cross green → clearance.
 *   cycle = mainGreen + crossGreen + 2 · clearanceSec.
 * - Saturation flow: one vehicle per `saturationHeadwaySec` per lane
 *   (2 s ⇒ 1800 veh/h/lane). A road discharges lanes × directions / headway
 *   vehicles per second of green, after `startupLostSec` at the start of each green.
 *   Unused green capacity cannot be banked.
 * - Time advances in 1-second steps. Vehicles arriving and discharging within
 *   the same second wait 0 s.
 * - Waiting time counts every vehicle that arrived; those still queued at the
 *   end contribute the time they had waited so far (a lower bound).
 */
export const TRAFFIC_MODEL = {
  durationSec: 600,
  saturationHeadwaySec: 2,
  startupLostSec: 2,
  clearanceSec: 4,
  directionsPerRoad: 2,
} as const;

export const ROAD_IDS = ["main", "cross"] as const;
export type RoadId = (typeof ROAD_IDS)[number];

export type SignalPhase = "mainGreen" | "mainClearance" | "crossGreen" | "crossClearance";

export interface TrafficFrame {
  /** Simulation second this frame describes (state at the end of the step). */
  t: number;
  phase: SignalPhase;
  queue: Record<RoadId, number>;
  /** Vehicles that left the stop line during this second. */
  served: Record<RoadId, number>;
}

export interface RoadStats {
  demandPerMin: number;
  /** Theoretical discharge capacity given lanes and the share of effective green. */
  capacityPerMin: number;
  /** Degree of saturation: demand ÷ capacity. Above 1 the queue keeps growing. */
  saturation: number;
  arrived: number;
  served: number;
  remainingQueue: number;
  avgWaitSec: number;
  maxWaitSec: number;
  maxQueue: number;
  avgQueue: number;
}

export interface TrafficSummary {
  avgWaitSec: number;
  maxQueue: number;
  vehiclesServed: number;
  /** Highest road degree of saturation, as a percentage. */
  congestion: number;
}

export type CongestionLevel = "Low" | "Moderate" | "Heavy" | "Oversaturated";

export interface TrafficResult {
  params: TrafficParams;
  durationSec: number;
  cycleSec: number;
  roads: Record<RoadId, RoadStats>;
  summary: TrafficSummary;
  congestionLevel: CongestionLevel;
  timeline: TrafficFrame[];
}

export function phaseAt(t: number, params: TrafficParams): { phase: SignalPhase; greenElapsed: number } {
  const { clearanceSec } = TRAFFIC_MODEL;
  const cycle = params.mainGreenSec + params.crossGreenSec + 2 * clearanceSec;
  const pos = t % cycle;
  if (pos < params.mainGreenSec) return { phase: "mainGreen", greenElapsed: pos };
  if (pos < params.mainGreenSec + clearanceSec) return { phase: "mainClearance", greenElapsed: -1 };
  const crossStart = params.mainGreenSec + clearanceSec;
  if (pos < crossStart + params.crossGreenSec) return { phase: "crossGreen", greenElapsed: pos - crossStart };
  return { phase: "crossClearance", greenElapsed: -1 };
}

export function congestionLevel(saturation: number): CongestionLevel {
  if (saturation < 0.6) return "Low";
  if (saturation < 0.85) return "Moderate";
  if (saturation < 1) return "Heavy";
  return "Oversaturated";
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface RoadState {
  ratePerMin: number;
  greenSec: number;
  /** Arrival times of queued vehicles; `head` marks the front of the queue. */
  queue: number[];
  head: number;
  nextVehicle: number;
  arrived: number;
  served: number;
  totalWait: number;
  maxWait: number;
  maxQueue: number;
  queueSum: number;
  credit: number;
}

function newRoad(ratePerMin: number, greenSec: number): RoadState {
  return {
    ratePerMin,
    greenSec,
    queue: [],
    head: 0,
    nextVehicle: 0,
    arrived: 0,
    served: 0,
    totalWait: 0,
    maxWait: 0,
    maxQueue: 0,
    queueSum: 0,
    credit: 0,
  };
}

const queueLength = (r: RoadState) => r.queue.length - r.head;

export interface TrafficOptions {
  /** Simulated period in seconds (default 600 = 10 minutes). */
  durationSec?: number;
}

/** Runs the deterministic intersection model. Throws on invalid parameters. */
export function simulateTraffic(input: TrafficParams, options: TrafficOptions = {}): TrafficResult {
  const params = TrafficParamsSchema.parse(input);
  const durationSec = options.durationSec ?? TRAFFIC_MODEL.durationSec;
  if (!Number.isInteger(durationSec) || durationSec < 60 || durationSec > 3600) {
    throw new RangeError("durationSec must be an integer between 60 and 3600");
  }

  const { saturationHeadwaySec, startupLostSec, clearanceSec, directionsPerRoad } = TRAFFIC_MODEL;
  const cycleSec = params.mainGreenSec + params.crossGreenSec + 2 * clearanceSec;
  const dischargePerSec = (params.lanesPerApproach * directionsPerRoad) / saturationHeadwaySec;

  const roads: Record<RoadId, RoadState> = {
    main: newRoad(params.mainArrivalsPerMin, params.mainGreenSec),
    cross: newRoad(params.crossArrivalsPerMin, params.crossGreenSec),
  };
  const timeline: TrafficFrame[] = [];
  let maxTotalQueue = 0;

  for (let t = 0; t < durationSec; t++) {
    const { phase, greenElapsed } = phaseAt(t, params);
    const served: Record<RoadId, number> = { main: 0, cross: 0 };

    for (const id of ROAD_IDS) {
      const road = roads[id];

      // Arrivals during [t, t + 1)
      const headway = 60 / road.ratePerMin;
      while ((road.nextVehicle + 0.5) * headway < t + 1) {
        road.queue.push((road.nextVehicle + 0.5) * headway);
        road.nextVehicle++;
        road.arrived++;
      }

      // Discharge during effective green
      const isGreen = (id === "main" && phase === "mainGreen") || (id === "cross" && phase === "crossGreen");
      if (isGreen && greenElapsed >= startupLostSec) {
        road.credit += dischargePerSec;
        while (road.credit >= 1 && queueLength(road) > 0) {
          const wait = Math.max(0, t - road.queue[road.head]);
          road.head++;
          road.credit -= 1;
          road.served++;
          served[id]++;
          road.totalWait += wait;
          road.maxWait = Math.max(road.maxWait, wait);
        }
        if (queueLength(road) === 0) road.credit = 0;
      } else {
        road.credit = 0;
      }

      const q = queueLength(road);
      road.maxQueue = Math.max(road.maxQueue, q);
      road.queueSum += q;
    }

    const queue = { main: queueLength(roads.main), cross: queueLength(roads.cross) };
    maxTotalQueue = Math.max(maxTotalQueue, queue.main + queue.cross);
    timeline.push({ t, phase, queue, served });
  }

  const stats = {} as Record<RoadId, RoadStats>;
  let totalWait = 0;
  let totalArrived = 0;
  for (const id of ROAD_IDS) {
    const road = roads[id];
    // Vehicles still queued contribute their wait so far.
    for (let i = road.head; i < road.queue.length; i++) {
      const wait = durationSec - road.queue[i];
      road.totalWait += wait;
      road.maxWait = Math.max(road.maxWait, wait);
    }
    const effectiveGreen = Math.max(0, road.greenSec - startupLostSec);
    const capacityPerMin = (dischargePerSec * effectiveGreen * 60) / cycleSec;
    stats[id] = {
      demandPerMin: road.ratePerMin,
      capacityPerMin: round1(capacityPerMin),
      saturation: round2(road.ratePerMin / capacityPerMin),
      arrived: road.arrived,
      served: road.served,
      remainingQueue: queueLength(road),
      avgWaitSec: round1(road.arrived ? road.totalWait / road.arrived : 0),
      maxWaitSec: round1(road.maxWait),
      maxQueue: road.maxQueue,
      avgQueue: round1(road.queueSum / durationSec),
    };
    totalWait += road.totalWait;
    totalArrived += road.arrived;
  }

  const criticalSaturation = Math.max(stats.main.saturation, stats.cross.saturation);

  return {
    params,
    durationSec,
    cycleSec,
    roads: stats,
    summary: {
      avgWaitSec: round1(totalArrived ? totalWait / totalArrived : 0),
      maxQueue: maxTotalQueue,
      vehiclesServed: stats.main.served + stats.cross.served,
      congestion: Math.round(criticalSaturation * 100),
    },
    congestionLevel: congestionLevel(criticalSaturation),
    timeline,
  };
}
