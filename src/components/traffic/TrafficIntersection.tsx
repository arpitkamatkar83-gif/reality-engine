"use client";

import { useMemo, type ReactNode } from "react";
import { byDepth, IsoBox, IsoLight, IsoTile, project, type Shades } from "@/components/iso/iso";
import { ROAD_IDS, type RoadId, type SignalPhase, type TrafficFrame } from "@/lib/simulation/traffic";
import {
  CENTRE,
  CROSS_SEC,
  halfWidth,
  LANE_W,
  maxSlots,
  movingCar,
  queuedCar,
  queueTail,
  ROAD_DIRECTIONS,
  signalPole,
  WORLD,
  type CarBox,
} from "./geometry";

const GROUND: Shades = { top: "#121b31", left: "#0b1222", right: "#080d1a" };
const BUILDING: Shades = { top: "#2c3f6b", left: "#1e2c50", right: "#16203d" };
const BUILDING_LOW: Shades = { top: "#24345a", left: "#1a2645", right: "#131c36" };
const TREE: Shades = { top: "#2f9e74", left: "#22795a", right: "#1a5e46" };
const SIDEWALK = "#18223d";
const POLE: Shades = { top: "#4b5a7d", left: "#33405e", right: "#26304a" };
const HEAD: Shades = { top: "#1f2740", left: "#151b2e", right: "#0f1424" };
export const CAR_SHADES: Record<RoadId, Shades> = {
  main: { top: "#7ee0f7", left: "#3fb5d6", right: "#2b8eac" },
  cross: { top: "#fcd57a", left: "#e6a93a", right: "#b8842a" },
};
const ROAD = "#283559";
const CAR_H = 0.38;

type Light = "green" | "amber" | "red" | "off";

function lightFor(road: RoadId, phase: SignalPhase | undefined): Light {
  if (!phase) return "off";
  if (phase === `${road}Green`) return "green";
  if (phase === `${road}Clearance`) return "amber";
  return "red";
}

const LAMP_COLORS = { red: "#f87171", amber: "#fbbf24", green: "#34d399" } as const;

interface Item {
  depth: number;
  node: ReactNode;
}

const carItem = (box: CarBox, shades: Shades, key: string, opacity = 1): Item => ({
  depth: box.x + box.w / 2 + box.y + box.d / 2,
  node: (
    <g key={key} opacity={opacity}>
      <IsoBox {...box} h={CAR_H} shades={shades} />
    </g>
  ),
});

function signalItem(dir: "S" | "N" | "E" | "W", lanes: number, light: Light): Item {
  const { x, y } = signalPole(dir, lanes);
  const lamps = ["red", "amber", "green"] as const;
  return {
    depth: x + y + 0.3,
    node: (
      <g key={`sig-${dir}`}>
        <IsoBox x={x} y={y} w={0.12} d={0.12} h={1.7} shades={POLE} />
        <IsoBox x={x - 0.08} y={y - 0.08} z={1.7} w={0.28} d={0.28} h={0.95} shades={HEAD} />
        {lamps.map((lamp, i) => (
          <IsoLight
            key={lamp}
            x={x + 0.21}
            y={y + 0.21}
            z={2.45 - i * 0.3}
            r={1.7}
            color={light === lamp ? LAMP_COLORS[lamp] : "#2a3350"}
            className={light === lamp ? "" : "[&>circle:first-child]:hidden"}
          />
        ))}
      </g>
    ),
  };
}

/** Corner blocks: sidewalk, two buildings set back at the outer corner, and a couple of trees. */
const CORNERS = [
  { key: "nw", sx: 0, sy: 0, heights: [2.6, 1.4] },
  { key: "ne", sx: 1, sy: 0, heights: [1.6, 1.0] },
  { key: "sw", sx: 0, sy: 1, heights: [1.1, 0.7] },
  { key: "se", sx: 1, sy: 1, heights: [0.6, 0.45] },
] as const;

function cornerScenery(half: number): Item[] {
  const size = CENTRE - half - 0.15;
  const items: Item[] = [];
  for (const { key, sx, sy, heights } of CORNERS) {
    const x0 = sx ? WORLD - size : 0;
    const y0 = sy ? WORLD - size : 0;
    // Positions measured from the outer corner inwards.
    const at = (fromOuterX: number, fromOuterY: number, w: number, d: number) => ({
      x: sx ? WORLD - fromOuterX - w : fromOuterX,
      y: sy ? WORLD - fromOuterY - d : fromOuterY,
    });
    const big = size * 0.48;
    const small = size * 0.3;
    const a = at(0.35, 0.35, big, big);
    const b = at(0.35 + big + 0.3, 0.35, small, small * 1.3);
    const t1 = at(size * 0.62, size * 0.72, 0.4, 0.4);
    const t2 = at(size * 0.3, size * 0.78, 0.4, 0.4);
    items.push(
      { depth: -100, node: <IsoTile key={`sw-${key}`} x={x0} y={y0} w={size} d={size} fill={SIDEWALK} /> },
      { depth: a.x + a.y + big, node: <IsoBox key={`ba-${key}`} {...a} w={big} d={big} h={heights[0]} shades={BUILDING} /> },
      { depth: b.x + b.y + small, node: <IsoBox key={`bb-${key}`} {...b} w={small} d={small * 1.3} h={heights[1]} shades={BUILDING_LOW} /> },
      { depth: t1.x + t1.y + 0.4, node: <IsoBox key={`t1-${key}`} {...t1} w={0.4} d={0.4} h={0.5} shades={TREE} /> },
      { depth: t2.x + t2.y + 0.4, node: <IsoBox key={`t2-${key}`} {...t2} w={0.4} d={0.4} h={0.5} shades={TREE} /> },
    );
  }
  return items;
}

interface Props {
  lanes: number;
  timeline?: TrafficFrame[];
  simTime: number;
  className?: string;
}

/** Isometric intersection whose lights, queues and moving vehicles are driven by the simulation timeline. */
export function TrafficIntersection({ lanes, timeline, simTime, className = "" }: Props) {
  // Cumulative vehicles served before each frame: gives every discharged vehicle a stable index.
  const servedBefore = useMemo(() => {
    const acc: Record<RoadId, number[]> = { main: [], cross: [] };
    if (!timeline) return acc;
    for (const road of ROAD_IDS) {
      let total = 0;
      for (const frame of timeline) {
        acc[road].push(total);
        total += frame.served[road];
      }
    }
    return acc;
  }, [timeline]);

  const half = halfWidth(lanes);
  const slots = maxSlots(lanes);
  const frameIndex = timeline ? Math.min(timeline.length - 1, Math.floor(simTime)) : -1;
  const frame = timeline?.[frameIndex];

  const items: Item[] = [];
  const overflow: { key: string; x: number; y: number; count: number }[] = [];

  items.push(...cornerScenery(half));

  for (const road of ROAD_IDS) {
    const [dirA, dirB] = ROAD_DIRECTIONS[road];
    const light = lightFor(road, frame?.phase);
    items.push(signalItem(dirA, lanes, light), signalItem(dirB, lanes, light));
    if (!frame || !timeline) continue;

    // Vehicles discharged during the last CROSS_SEC seconds, spread evenly within their second.
    let departingNow = 0;
    for (let i = Math.max(0, frameIndex - CROSS_SEC); i <= frameIndex; i++) {
      const served = timeline[i].served[road];
      for (let j = 0; j < served; j++) {
        const n = servedBefore[road][i] + j;
        const progress = (simTime - (i + j / served)) / CROSS_SEC;
        if (progress < 0) {
          departingNow++; // still at the stop line this instant
          continue;
        }
        if (progress >= 1) continue;
        const dir = n % 2 === 0 ? dirA : dirB;
        const lane = Math.floor(n / 2) % lanes;
        items.push(carItem(movingCar(dir, lanes, lane, progress), CAR_SHADES[road], `m-${road}-${n}`));
      }
    }

    // Queued vehicles, split across both directions and their lanes.
    const queued = frame.queue[road] + departingNow;
    const perDir = [Math.ceil(queued / 2), Math.floor(queued / 2)];
    [dirA, dirB].forEach((dir, d) => {
      let hidden = 0;
      for (let i = 0; i < perDir[d]; i++) {
        const lane = i % lanes;
        const slot = Math.floor(i / lanes);
        if (slot >= slots) {
          hidden++;
          continue;
        }
        items.push(carItem(queuedCar(dir, lanes, lane, slot), CAR_SHADES[road], `q-${dir}-${i}`));
      }
      if (hidden > 0) overflow.push({ key: dir, ...queueTail(dir, lanes), count: hidden });
    });
  }

  const laneDividers: ReactNode[] = [];
  for (let k = 1; k < lanes; k++) {
    for (const side of [-1, 1]) {
      const pos = CENTRE + side * k * LANE_W;
      for (let t = 0.3; t < WORLD; t += 1.1) {
        if (t > CENTRE - half - 0.6 && t < CENTRE + half + 0.2) continue;
        laneDividers.push(
          <IsoTile key={`lx-${k}-${side}-${t}`} x={pos - 0.03} y={t} w={0.06} d={0.5} fill="#e6ebf5" opacity={0.35} />,
          <IsoTile key={`ly-${k}-${side}-${t}`} x={t} y={pos - 0.03} w={0.5} d={0.06} fill="#e6ebf5" opacity={0.35} />,
        );
      }
    }
  }

  const stopOffset = half + 0.3;
  const crosswalk: ReactNode[] = [];
  for (let s = -half + 0.1; s < half - 0.1; s += 0.3) {
    crosswalk.push(
      <IsoTile key={`cw-n-${s}`} x={CENTRE + s} y={CENTRE - half - 0.25} w={0.16} d={0.22} fill="#e6ebf5" opacity={0.25} />,
      <IsoTile key={`cw-s-${s}`} x={CENTRE + s} y={CENTRE + half + 0.03} w={0.16} d={0.22} fill="#e6ebf5" opacity={0.25} />,
      <IsoTile key={`cw-w-${s}`} x={CENTRE - half - 0.25} y={CENTRE + s} w={0.22} d={0.16} fill="#e6ebf5" opacity={0.25} />,
      <IsoTile key={`cw-e-${s}`} x={CENTRE + half + 0.03} y={CENTRE + s} w={0.22} d={0.16} fill="#e6ebf5" opacity={0.25} />,
    );
  }

  return (
    <svg viewBox="-200 -62 400 300" className={className} role="img" aria-label="Animated isometric intersection">
      <IsoBox x={0} y={0} z={-0.5} w={WORLD} d={WORLD} h={0.5} shades={GROUND} />
      <IsoTile x={CENTRE - half} y={0} w={half * 2} d={WORLD} fill={ROAD} />
      <IsoTile x={0} y={CENTRE - half} w={WORLD} d={half * 2} fill={ROAD} />
      {/* Centre lines (not drawn through the junction) */}
      <IsoTile x={CENTRE - 0.05} y={0} w={0.1} d={CENTRE - stopOffset} fill="#fbbf24" opacity={0.7} />
      <IsoTile x={CENTRE - 0.05} y={CENTRE + stopOffset} w={0.1} d={WORLD - CENTRE - stopOffset} fill="#fbbf24" opacity={0.7} />
      <IsoTile x={0} y={CENTRE - 0.05} w={CENTRE - stopOffset} d={0.1} fill="#fbbf24" opacity={0.7} />
      <IsoTile x={CENTRE + stopOffset} y={CENTRE - 0.05} w={WORLD - CENTRE - stopOffset} d={0.1} fill="#fbbf24" opacity={0.7} />
      {laneDividers}
      {crosswalk}
      {/* Stop lines, one per approach */}
      <IsoTile x={CENTRE - half} y={CENTRE - stopOffset} w={half} d={0.08} fill="#e6ebf5" opacity={0.75} />
      <IsoTile x={CENTRE} y={CENTRE + stopOffset - 0.08} w={half} d={0.08} fill="#e6ebf5" opacity={0.75} />
      <IsoTile x={CENTRE - stopOffset} y={CENTRE} w={0.08} d={half} fill="#e6ebf5" opacity={0.75} />
      <IsoTile x={CENTRE + stopOffset - 0.08} y={CENTRE - half} w={0.08} d={half} fill="#e6ebf5" opacity={0.75} />
      {byDepth(items).map((i) => i.node)}
      {overflow.map((o) => {
        const [cx, cy] = project(o.x, o.y, 1.2);
        return (
          <g key={`of-${o.key}`}>
            <rect x={cx - 16} y={cy - 9} width={32} height={16} rx={8} fill="#0a1020" stroke="#f87171" strokeOpacity={0.6} />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize={9} fill="#fca5a5" fontFamily="var(--font-mono)">
              +{o.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
