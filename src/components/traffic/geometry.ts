import type { RoadId } from "@/lib/simulation/traffic";

/**
 * World layout for the intersection scene (isometric world units).
 * Main road runs along y (north–south), cross street along x (east–west).
 * Traffic keeps right: southbound uses x < centre, eastbound uses y > centre.
 */
export const WORLD = 16;
export const CENTRE = WORLD / 2;
export const LANE_W = 0.75;
export const CAR_L = 0.9;
export const CAR_W = 0.46;
export const CAR_GAP = 1.15;
/** Simulated seconds a discharged vehicle takes to clear the scene. */
export const CROSS_SEC = 8;

export type Direction = "S" | "N" | "E" | "W";

export const ROAD_DIRECTIONS: Record<RoadId, [Direction, Direction]> = {
  main: ["S", "N"],
  cross: ["E", "W"],
};

export const halfWidth = (lanes: number) => lanes * LANE_W;

/** Coordinate of the front bumper when stopped at the stop line, along the direction of travel. */
function stopLine(dir: Direction, lanes: number): number {
  const h = halfWidth(lanes);
  return dir === "S" || dir === "E" ? CENTRE - h - 0.35 : CENTRE + h + 0.35;
}

/** Lateral centre of a lane for a direction. */
function laneCentre(dir: Direction, lane: number): number {
  const offset = (lane + 0.5) * LANE_W;
  return dir === "S" || dir === "W" ? CENTRE - offset : CENTRE + offset;
}

export interface CarBox {
  x: number;
  y: number;
  w: number;
  d: number;
}

/** Box for a car whose front bumper is at `front` along its direction of travel. */
function boxAt(dir: Direction, lane: number, front: number): CarBox {
  const lateral = laneCentre(dir, lane) - CAR_W / 2;
  switch (dir) {
    case "S":
      return { x: lateral, y: front - CAR_L, w: CAR_W, d: CAR_L };
    case "N":
      return { x: lateral, y: front, w: CAR_W, d: CAR_L };
    case "E":
      return { x: front - CAR_L, y: lateral, w: CAR_L, d: CAR_W };
    case "W":
      return { x: front, y: lateral, w: CAR_L, d: CAR_W };
  }
}

/** How many cars fit in one lane between the stop line and the edge of the scene. */
export function maxSlots(lanes: number): number {
  const room = stopLine("S", lanes) - CAR_L - 0.1;
  return Math.floor(room / CAR_GAP) + 1;
}

export function queuedCar(dir: Direction, lanes: number, lane: number, slot: number): CarBox {
  const stop = stopLine(dir, lanes);
  const forward = dir === "S" || dir === "E" ? 1 : -1;
  return boxAt(dir, lane, stop - forward * slot * CAR_GAP);
}

/** Car `progress` (0–1) of the way from its stop line to the far edge of the scene. */
export function movingCar(dir: Direction, lanes: number, lane: number, progress: number): CarBox {
  const stop = stopLine(dir, lanes);
  const end = dir === "S" || dir === "E" ? WORLD - CAR_L : CAR_L;
  return boxAt(dir, lane, stop + (end - stop) * progress);
}

/** Point just beyond the last queue slot, used to label overflow. */
export function queueTail(dir: Direction, lanes: number): { x: number; y: number } {
  const lateral = CENTRE + (dir === "S" || dir === "W" ? -1 : 1) * halfWidth(lanes) / 2;
  const along = dir === "S" || dir === "E" ? 0.4 : WORLD - 0.4;
  return dir === "S" || dir === "N" ? { x: lateral, y: along } : { x: along, y: lateral };
}

/** Signal pole on the kerb to the right of each approach. */
export function signalPole(dir: Direction, lanes: number): { x: number; y: number } {
  const near = CENTRE - halfWidth(lanes) - 0.55;
  const far = CENTRE + halfWidth(lanes) + 0.3;
  switch (dir) {
    case "S":
      return { x: near, y: near };
    case "N":
      return { x: far, y: far };
    case "E":
      return { x: near, y: far };
    case "W":
      return { x: far, y: near };
  }
}
