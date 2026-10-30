import type { ReactNode } from "react";
import { byDepth, IsoBox, IsoLight, IsoTile, project, type Shades } from "@/components/iso/iso";

const GROUND: Shades = { top: "#0f1d2a", left: "#0a1520", right: "#071019" };
const WING: Shades = { top: "#d9e6f2", left: "#9fb4c9", right: "#7c92a8" };
const WING_DARK: Shades = { top: "#b9cadb", left: "#869cb3", right: "#687e95" };
const AMBULANCE: Shades = { top: "#f5f7fb", left: "#c9d2e0", right: "#a3aec0" };
const PATIENT: Shades = { top: "#fda4af", left: "#e2768a", right: "#b85a6c" };
const DOCTOR: Shades = { top: "#6ee7b7", left: "#34b98a", right: "#25906a" };

interface Item {
  depth: number;
  node: ReactNode;
}

function person(x: number, y: number, shades: Shades, key: string): Item {
  return { depth: x + y + 0.4, node: <IsoBox key={key} x={x} y={y} w={0.32} d={0.32} h={0.7} shades={shades} /> };
}

/** Window strip along the visible front faces of a wing. */
function windows(x: number, y: number, w: number, d: number, h: number, key: string) {
  const rows = Math.floor(h / 0.9);
  const [ax, ay] = project(x, y + d, 0);
  const [bx, by] = project(x + w, y + d, 0);
  const lines: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const z = 0.5 + r * 0.9;
    const dz = z * 14;
    lines.push(
      <line
        key={`${key}-${r}`}
        x1={ax + 4}
        y1={ay - dz + 2}
        x2={bx - 4}
        y2={by - dz - 2}
        stroke="#4cc9f0"
        strokeOpacity={0.55}
        strokeWidth={2}
        strokeDasharray="5 4"
      />,
    );
  }
  return <g key={key}>{lines}</g>;
}

/** Static isometric emergency department used for previews. */
export function HospitalScene({ className = "" }: { className?: string }) {
  const items: Item[] = [
    {
      depth: 4,
      node: (
        <g key="main">
          <IsoBox x={0.6} y={0.6} w={5.4} d={3.4} h={3} shades={WING} />
          {windows(0.6, 0.6, 5.4, 3.4, 3, "w-main")}
          {/* Rooftop cross */}
          <IsoTile x={2.9} y={1.6} w={0.8} d={0.25} z={3.01} fill="#f43f5e" />
          <IsoTile x={3.175} y={1.325} w={0.25} d={0.8} z={3.01} fill="#f43f5e" />
        </g>
      ),
    },
    {
      depth: 9,
      node: (
        <g key="er">
          <IsoBox x={0.6} y={4.6} w={3.6} d={3.2} h={1.6} shades={WING_DARK} />
          {windows(0.6, 4.6, 3.6, 3.2, 1.6, "w-er")}
          <IsoLight x={4.2} y={6.2} z={1.3} color="#f43f5e" className="animate-pulse" />
        </g>
      ),
    },
    // Ambulance bay
    {
      depth: 13,
      node: (
        <g key="amb">
          <IsoBox x={6.4} y={6.4} w={1.6} d={0.8} h={0.7} shades={AMBULANCE} />
          <IsoTile x={6.9} y={6.4} w={0.6} d={0.8} z={0.71} fill="#f43f5e" opacity={0.85} />
          <IsoLight x={7.2} y={6.8} z={0.95} r={1.6} color="#60a5fa" className="animate-pulse" />
        </g>
      ),
    },
    // Patient queue heading into the ER entrance
    person(5.2, 5.0, PATIENT, "p1"),
    person(5.9, 5.0, PATIENT, "p2"),
    person(6.6, 5.0, PATIENT, "p3"),
    person(7.3, 5.0, PATIENT, "p4"),
    person(8.0, 5.0, PATIENT, "p5"),
    // Staff
    person(4.6, 5.9, DOCTOR, "d1"),
    person(6.8, 2.6, DOCTOR, "d2"),
  ];

  return (
    <svg viewBox="-135 -60 270 215" className={className} role="img" aria-label="Isometric hospital emergency department">
      <IsoBox x={0} y={0} w={10} d={10} h={0.4} z={-0.4} shades={GROUND} />
      {/* Access road and drop-off path */}
      <IsoTile x={8.6} y={0} w={1.4} d={10} fill="#16263a" />
      <IsoTile x={4.4} y={4.7} w={4.2} d={1} fill="#1b3247" />
      {[0.5, 2, 3.5, 5, 6.5, 8].map((t) => (
        <IsoTile key={t} x={9.27} y={t} w={0.06} d={0.7} fill="#e6ebf5" opacity={0.35} />
      ))}
      {/* Flow arrow markings on the path */}
      {[5.4, 6.4, 7.4].map((t) => (
        <IsoTile key={t} x={t} y={5.12} w={0.35} d={0.16} fill="#34d399" opacity={0.5} />
      ))}
      {byDepth(items).map((i) => i.node)}
    </svg>
  );
}
