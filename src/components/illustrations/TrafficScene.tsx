import type { ReactNode } from "react";
import { byDepth, IsoBox, IsoLight, IsoTile, type Shades } from "@/components/iso/iso";

const GROUND: Shades = { top: "#111a30", left: "#0b1222", right: "#080d1a" };
const BUILDING: Shades = { top: "#24345a", left: "#1a2645", right: "#131c36" };
const BUILDING_TALL: Shades = { top: "#2c3f6b", left: "#1e2c50", right: "#16203d" };
const CAR_CYAN: Shades = { top: "#7ee0f7", left: "#3fb5d6", right: "#2b8eac" };
const CAR_AMBER: Shades = { top: "#fcd57a", left: "#e6a93a", right: "#b8842a" };
const CAR_SLATE: Shades = { top: "#c2cbe0", left: "#8d98b3", right: "#6c7690" };
const POLE: Shades = { top: "#4b5a7d", left: "#33405e", right: "#26304a" };

interface Item {
  depth: number;
  node: ReactNode;
}

function car(x: number, y: number, horizontal: boolean, shades: Shades, key: string): Item {
  const [w, d] = horizontal ? [0.9, 0.5] : [0.5, 0.9];
  return { depth: x + y + 1, node: <IsoBox key={key} x={x} y={y} w={w} d={d} h={0.35} shades={shades} /> };
}

function signal(x: number, y: number, color: string, key: string): Item {
  return {
    depth: x + y + 0.5,
    node: (
      <g key={key}>
        <IsoBox x={x} y={y} w={0.15} d={0.15} h={1.6} shades={POLE} />
        <IsoLight x={x + 0.08} y={y + 0.08} z={1.8} color={color} className="animate-pulse" />
      </g>
    ),
  };
}

/** Static isometric four-way intersection used for previews. */
export function TrafficScene({ className = "" }: { className?: string }) {
  const items: Item[] = [
    // Corner blocks
    { depth: 2, node: <IsoBox key="b1" x={0.4} y={0.4} w={2.8} d={2.6} h={2.6} shades={BUILDING_TALL} /> },
    { depth: 8, node: <IsoBox key="b2" x={7} y={0.4} w={2.6} d={2.6} h={1.4} shades={BUILDING} /> },
    { depth: 8, node: <IsoBox key="b3" x={0.4} y={7} w={2.6} d={2.6} h={1.8} shades={BUILDING} /> },
    { depth: 14, node: <IsoBox key="b4" x={7.2} y={7.2} w={2.4} d={2.4} h={0.9} shades={BUILDING} /> },
    // Queued cars: main road (vertical in world y) and cross street
    car(5.25, 0.6, false, CAR_CYAN, "c1"),
    car(5.25, 1.8, false, CAR_SLATE, "c2"),
    car(5.25, 3.0, false, CAR_CYAN, "c3"),
    car(4.25, 7.2, false, CAR_AMBER, "c4"),
    car(4.25, 8.4, false, CAR_SLATE, "c5"),
    car(0.8, 4.25, true, CAR_AMBER, "c6"),
    car(2.0, 4.25, true, CAR_CYAN, "c7"),
    car(7.4, 5.25, true, CAR_SLATE, "c8"),
    // Signals at the stop lines
    signal(3.6, 3.6, "#34d399", "s1"),
    signal(6.25, 6.25, "#34d399", "s2"),
    signal(6.25, 3.6, "#f87171", "s3"),
    signal(3.6, 6.25, "#f87171", "s4"),
  ];

  return (
    <svg viewBox="-135 -50 270 205" className={className} role="img" aria-label="Isometric city intersection">
      <IsoBox x={0} y={0} w={10} d={10} h={0.4} z={-0.4} shades={GROUND} />
      {/* Roads */}
      <IsoTile x={4} y={0} w={2} d={10} fill="#283559" />
      <IsoTile x={0} y={4} w={10} d={2} fill="#283559" />
      {/* Lane markings */}
      {[0.4, 1.6, 2.8, 6.6, 7.8, 9].map((t) => (
        <g key={t}>
          <IsoTile x={4.97} y={t} w={0.06} d={0.6} fill="#fbbf24" opacity={0.55} />
          <IsoTile x={t} y={4.97} w={0.6} d={0.06} fill="#fbbf24" opacity={0.55} />
        </g>
      ))}
      {/* Stop lines */}
      <IsoTile x={4} y={3.8} w={2} d={0.08} fill="#e6ebf5" opacity={0.6} />
      <IsoTile x={4} y={6.12} w={2} d={0.08} fill="#e6ebf5" opacity={0.6} />
      <IsoTile x={3.8} y={4} w={0.08} d={2} fill="#e6ebf5" opacity={0.6} />
      <IsoTile x={6.12} y={4} w={0.08} d={2} fill="#e6ebf5" opacity={0.6} />
      {byDepth(items).map((i) => i.node)}
    </svg>
  );
}
