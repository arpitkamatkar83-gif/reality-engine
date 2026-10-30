import type { PatientRecord } from "@/lib/simulation/hospital";

/**
 * Floor plan for the emergency department scene (isometric world units).
 * x runs along the long side (reception/waiting → treatment), y front-to-back.
 */
export const FLOOR = { w: 20, d: 14 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
}

export const ZONES = {
  waiting: { x: 0.6, y: 0.8, w: 5.8, d: 8.8 },
  reception: { x: 0.6, y: 10.2, w: 5.8, d: 3.2 },
  treatment: { x: 7.2, y: 0.6, w: 12.2, d: 10.2 },
  staff: { x: 7.2, y: 11.4, w: 6.2, d: 2 },
  discharge: { x: 14, y: 11.4, w: 5.4, d: 2 },
} as const satisfies Record<string, Rect>;

export const ENTRANCE = { x: 5.4, y: 13.5 };
export const EXIT = { x: 19.2, y: 12.4 };
export const RECEPTION_DESK: Rect = { x: 1.2, y: 11.0, w: 3.2, d: 0.6 };
export const STAFF_DESK: Rect = { x: 7.6, y: 11.6, w: 5.4, d: 0.45 };

export const SEAT_COLS = 4;
export const SEAT_ROWS = 6;
export const SEATS = SEAT_COLS * SEAT_ROWS;

/** Waiting seat for queue position `rank` (0 = next to be seen, nearest the treatment area). */
export function seat(rank: number): { x: number; y: number } {
  const col = SEAT_COLS - 1 - Math.floor(rank / SEAT_ROWS);
  const row = rank % SEAT_ROWS;
  return { x: 1.3 + col * 1.35, y: 1.6 + row * 1.3 };
}

/** Bed rectangles laid out in a grid that fits the treatment zone for any bed count. */
export function bedLayout(beds: number): Rect[] {
  const zone = ZONES.treatment;
  const cols = beds <= 12 ? 6 : beds <= 24 ? 8 : beds <= 40 ? 10 : 12;
  const rows = Math.ceil(beds / cols);
  const pitchX = (zone.w - 0.8) / cols;
  const pitchY = Math.min(2.5, (zone.d - 0.8) / rows);
  const w = Math.min(0.95, pitchX * 0.62);
  const d = Math.min(1.6, pitchY * 0.68);
  const offsetY = zone.y + 0.4 + ((zone.d - 0.8) - rows * pitchY) / 2;
  return Array.from({ length: beds }, (_, i) => ({
    x: zone.x + 0.4 + (i % cols) * pitchX + (pitchX - w) / 2 - 0.2,
    y: offsetY + Math.floor(i / cols) * pitchY + (pitchY - d) / 2,
    w,
    d,
  }));
}

export const bedCentre = (bed: Rect) => ({ x: bed.x + bed.w / 2, y: bed.y + bed.d / 2 });
/** Where a doctor stands while treating the patient in `bed`. */
export const bedside = (bed: Rect) => ({ x: bed.x + bed.w + 0.3, y: bed.y + bed.d / 2 });

/** Idle doctors wait in front of the staff desk. */
export function staffSpot(doctor: number): { x: number; y: number } {
  return { x: 7.9 + (doctor % 10) * 0.55, y: 12.55 + Math.floor(doctor / 10) * 0.5 };
}

export type Stage = "arriving" | "waiting" | "treatment" | "observation" | "leaving";

/**
 * Stage of a patient at simulated minute `t`, straight from the engine's record.
 * `arriveWindow`/`leaveWindow` keep a patient briefly at the door so their
 * movement is visible; they never change the recorded timings.
 */
export function stageAt(p: PatientRecord, t: number, arriveWindow: number, leaveWindow: number): Stage | null {
  if (t < p.arrival) return null;
  if (p.start === null || t < p.start) return t < p.arrival + arriveWindow ? "arriving" : "waiting";
  if (t < p.treatmentEnd!) return "treatment";
  if (t < p.discharge!) return "observation";
  if (t < p.discharge! + leaveWindow) return "leaving";
  return null;
}
