/**
 * Minimal isometric helpers for SVG scenes. World units are projected so that
 * +x runs down-right, +y runs down-left and +z runs up the screen.
 */

const COS30 = Math.cos(Math.PI / 6);

export const ISO_SCALE = 14;

export function project(x: number, y: number, z = 0, s = ISO_SCALE): [number, number] {
  return [(x - y) * COS30 * s, ((x + y) * 0.5 - z) * s];
}

function points(coords: [number, number, number][]): string {
  return coords.map(([x, y, z]) => project(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");
}

export interface Shades {
  top: string;
  left: string;
  right: string;
}

interface BoxProps {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  shades: Shades;
  className?: string;
}

/** A solid box; draws only the three faces visible from the camera. */
export function IsoBox({ x, y, z = 0, w, d, h, shades, className }: BoxProps) {
  const x1 = x + w;
  const y1 = y + d;
  const z1 = z + h;
  return (
    <g className={className}>
      <polygon fill={shades.left} points={points([[x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1]])} />
      <polygon fill={shades.right} points={points([[x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1]])} />
      <polygon fill={shades.top} points={points([[x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1]])} />
    </g>
  );
}

interface TileProps {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  fill: string;
  className?: string;
  opacity?: number;
}

/** A flat rectangle lying on the ground plane (or at height z). */
export function IsoTile({ x, y, z = 0, w, d, fill, className, opacity }: TileProps) {
  return (
    <polygon
      className={className}
      fill={fill}
      opacity={opacity}
      points={points([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]])}
    />
  );
}

/** A glowing dot at a world position, e.g. a signal lamp or status light. */
export function IsoLight({
  x,
  y,
  z,
  r = 2.4,
  color,
  className,
}: {
  x: number;
  y: number;
  z: number;
  r?: number;
  color: string;
  className?: string;
}) {
  const [cx, cy] = project(x, y, z);
  return (
    <g className={className}>
      <circle cx={cx} cy={cy} r={r * 2.4} fill={color} opacity={0.18} />
      <circle cx={cx} cy={cy} r={r} fill={color} />
    </g>
  );
}

/** Sorts scene items back-to-front (painter's algorithm) by x + y depth. */
export function byDepth<T extends { depth: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.depth - b.depth);
}
