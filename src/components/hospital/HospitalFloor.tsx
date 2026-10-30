"use client";

import type { ReactNode } from "react";
import { byDepth, IsoBox, IsoLight, IsoTile, project, type Shades } from "@/components/iso/iso";
import type { PatientRecord } from "@/lib/simulation/hospital";
import {
  bedCentre,
  bedLayout,
  bedside,
  ENTRANCE,
  EXIT,
  FLOOR,
  RECEPTION_DESK,
  seat,
  SEATS,
  stageAt,
  STAFF_DESK,
  staffSpot,
  ZONES,
  type Rect,
  type Stage,
} from "./layout";

const FLOOR_SHADES: Shades = { top: "#0f1d2a", left: "#0a1520", right: "#071019" };
const WALL: Shades = { top: "#3b5068", left: "#2a3b50", right: "#22303f" };
const DESK: Shades = { top: "#4b6380", left: "#354860", right: "#2a3a4e" };
const CHAIR: Shades = { top: "#24364d", left: "#1a293b", right: "#14202f" };
const BED: Shades = { top: "#d9e6f2", left: "#9fb4c9", right: "#7c92a8" };
const BED_FREE: Shades = { top: "#5d7088", left: "#43546a", right: "#364457" };

export const PEOPLE_COLORS = {
  patient: "#fb7185",
  observation: "#fda4af",
  discharged: "#86efac",
  doctor: "#34d399",
} as const;

const STATUS_LAMP = { free: "#34d399", treatment: "#fb7185", observation: "#fbbf24" } as const;

/** Moves smoothly between positions; the position itself always comes from simulation data. */
function Token({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const [sx, sy] = project(x, y, 0);
  return (
    <g style={{ transform: `translate(${sx}px, ${sy}px)`, transition: "transform 450ms ease-in-out" }}>
      <g transform="scale(1.25)">{children}</g>
    </g>
  );
}

function Standing({ color, ring = false }: { color: string; ring?: boolean }) {
  return (
    <>
      <ellipse cx={0} cy={0} rx={4} ry={2} fill="#000" opacity={0.35} />
      {ring && <circle cx={0} cy={-9} r={9} fill={color} opacity={0.15} />}
      <rect x={-2.6} y={-11} width={5.2} height={10} rx={2.6} fill={color} />
      <circle cx={0} cy={-13.6} r={2.6} fill="#f1dccb" />
    </>
  );
}

function Lying({ color }: { color: string }) {
  return (
    <g transform="translate(0 -6)">
      <ellipse cx={0} cy={0} rx={6.5} ry={3.2} fill={color} />
      <circle cx={-5} cy={-2.5} r={2.4} fill="#f1dccb" />
    </g>
  );
}

const ZONE_STYLE: { zone: Rect; fill: string; label: string }[] = [
  { zone: ZONES.waiting, fill: "#13283a", label: "Waiting area" },
  { zone: ZONES.reception, fill: "#16263a", label: "Reception" },
  { zone: ZONES.treatment, fill: "#112a2c", label: "Treatment bays" },
  { zone: ZONES.staff, fill: "#142a26", label: "Staff station" },
  { zone: ZONES.discharge, fill: "#1a2a1c", label: "Discharge" },
];

/** Zone label along the zone's front-left edge, drawn above everything else so it stays legible. */
function ZoneLabel({ zone, label }: { zone: Rect; label: string }) {
  const [lx, ly] = project(zone.x + 0.2, zone.y + zone.d - 0.1, 0);
  return (
    <text x={lx + 3} y={ly - 3} fontSize={6.5} fill="#9aa7c2" fontFamily="var(--font-mono)" letterSpacing={0.6} paintOrder="stroke" stroke="#071019" strokeWidth={2.5}>
      {label.toUpperCase()}
    </text>
  );
}

interface Props {
  beds: number;
  doctors: number;
  patients?: PatientRecord[];
  simTime: number;
  /** Playback speed (sim minutes per real second), used only to keep door transitions visible. */
  speed: number;
  className?: string;
}

/** Isometric emergency department whose people and beds are driven by the engine's patient records. */
export function HospitalFloor({ beds, doctors, patients = [], simTime, speed, className = "" }: Props) {
  const bedRects = bedLayout(beds);
  const arriveWindow = Math.max(0.5, speed * 0.3);
  const leaveWindow = Math.max(1, speed * 0.5);

  const bedState: ("free" | "treatment" | "observation")[] = new Array(beds).fill("free");
  const doctorAt: (number | null)[] = new Array(doctors).fill(null);
  const people: { id: number; stage: Stage; x: number; y: number }[] = [];
  let waitingRank = 0;
  let overflow = 0;

  for (const p of patients) {
    const stage = stageAt(p, simTime, arriveWindow, leaveWindow);
    if (!stage) continue;
    if (stage === "arriving") {
      people.push({ id: p.id, stage, ...ENTRANCE });
    } else if (stage === "waiting") {
      if (waitingRank < SEATS) people.push({ id: p.id, stage, ...seat(waitingRank) });
      else overflow++;
      waitingRank++;
    } else if (stage === "leaving") {
      people.push({ id: p.id, stage, ...EXIT });
    } else {
      bedState[p.bed!] = stage;
      if (stage === "treatment") doctorAt[p.doctor!] = p.bed;
      people.push({ id: p.id, stage, ...bedCentre(bedRects[p.bed!]) });
    }
  }

  const furniture: { depth: number; node: ReactNode }[] = [];
  for (let i = 0; i < SEATS; i++) {
    const s = seat(i);
    furniture.push({ depth: s.x + s.y, node: <IsoBox key={`c${i}`} x={s.x - 0.3} y={s.y - 0.3} w={0.6} d={0.6} h={0.25} shades={CHAIR} /> });
  }
  bedRects.forEach((b, i) => {
    furniture.push({
      depth: b.x + b.y + b.w,
      node: (
        <g key={`b${i}`}>
          <IsoBox {...b} h={0.35} shades={bedState[i] === "free" ? BED_FREE : BED} />
          <IsoTile x={b.x + 0.08} y={b.y + 0.08} z={0.36} w={b.w - 0.16} d={Math.min(0.35, b.d * 0.25)} fill="#9fd8f5" opacity={0.8} />
          <IsoLight x={b.x + b.w} y={b.y} z={0.75} r={1.3} color={STATUS_LAMP[bedState[i]]} />
        </g>
      ),
    });
  });
  furniture.push(
    { depth: 20, node: <IsoBox key="rd" {...RECEPTION_DESK} h={0.7} shades={DESK} /> },
    { depth: 30, node: <IsoBox key="sd" {...STAFF_DESK} h={0.6} shades={DESK} /> },
  );

  const [ofx, ofy] = project(5.2, 10.9, 0);

  return (
    <svg viewBox="-178 -24 428 272" className={className} role="img" aria-label="Animated isometric emergency department">
      <IsoBox x={0} y={0} z={-0.4} w={FLOOR.w} d={FLOOR.d} h={0.4} shades={FLOOR_SHADES} />
      {ZONE_STYLE.map(({ zone, fill, label }) => (
        <IsoTile key={label} {...zone} fill={fill} />
      ))}
      {/* Back walls */}
      <IsoBox x={0} y={-0.25} w={FLOOR.w} d={0.25} h={1.1} shades={WALL} />
      <IsoBox x={-0.25} y={-0.25} w={0.25} d={FLOOR.d + 0.25} h={1.1} shades={WALL} />
      {/* Entrance and exit markers on the front edges */}
      <IsoTile x={ENTRANCE.x - 0.7} y={FLOOR.d - 0.15} w={1.4} d={0.15} fill="#4cc9f0" opacity={0.8} />
      <IsoTile x={FLOOR.w - 0.15} y={EXIT.y - 0.7} w={0.15} d={1.4} fill="#86efac" opacity={0.8} />
      {byDepth(furniture).map((f) => f.node)}

      {overflow > 0 && (
        <g>
          <rect x={ofx - 22} y={ofy - 9} width={44} height={16} rx={8} fill="#0a1020" stroke="#fb7185" strokeOpacity={0.6} />
          <text x={ofx} y={ofy + 3} textAnchor="middle" fontSize={8.5} fill="#fda4af" fontFamily="var(--font-mono)">
            +{overflow} waiting
          </text>
        </g>
      )}

      {/* Doctors: idle at the staff station, or beside the bed of the patient they are treating */}
      {doctorAt.map((bed, d) => {
        const pos = bed === null ? staffSpot(d) : bedside(bedRects[bed]);
        return (
          <Token key={`d${d}`} {...pos}>
            <Standing color={PEOPLE_COLORS.doctor} ring={bed !== null} />
          </Token>
        );
      })}

      {ZONE_STYLE.map(({ zone, label }) => (
        <ZoneLabel key={label} zone={zone} label={label} />
      ))}

      {/* Patients */}
      {people.map((p) => (
        <Token key={`p${p.id}`} x={p.x} y={p.y}>
          {p.stage === "treatment" || p.stage === "observation" ? (
            <Lying color={p.stage === "treatment" ? PEOPLE_COLORS.patient : PEOPLE_COLORS.observation} />
          ) : (
            <Standing color={p.stage === "leaving" ? PEOPLE_COLORS.discharged : PEOPLE_COLORS.patient} />
          )}
        </Token>
      ))}
    </svg>
  );
}
