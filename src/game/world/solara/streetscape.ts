import downtown from "./downtown-metrics.json" with { type: "json" };
import phase1 from "./phase1-metrics.json" with { type: "json" };

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface HalfBox {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

/** Solara ring. The tower mesh is not part of this list. */
export const RING: Rect[] = [
  { x: 0, z: -50, w: 112, d: 8 },
  { x: 0, z: 38, w: 112, d: 8 },
  { x: 52, z: -6, w: 8, d: 96 },
  { x: -52, z: -6, w: 8, d: 96 },
];

const X_CUTS: [number, number][] = [
  [-149.5, -134.5],
  [-57.5, -46.5],
  [46.5, 57.5],
  [122.5, 137.5],
];

const Z_CUTS: [number, number][] = [
  [-131.5, -116.5],
  [-55.5, -44.5],
  [32.5, 43.5],
  [107.5, 128.5],
];

export function allRoads(): Rect[] {
  return [...RING, ...downtown.roads, ...phase1.roads];
}

export function halfBox(rect: { x: number; z: number; w?: number; d?: number; hx?: number; hz?: number }): HalfBox {
  return {
    x: rect.x,
    z: rect.z,
    hx: rect.hx ?? (rect.w ?? 0) / 2,
    hz: rect.hz ?? (rect.d ?? 0) / 2,
  };
}

export function separated(a: HalfBox, b: HalfBox, gap = 0) {
  return Math.abs(a.x - b.x) >= a.hx + b.hx + gap || Math.abs(a.z - b.z) >= a.hz + b.hz + gap;
}

export function overlapArea(a: HalfBox, b: HalfBox) {
  const x = Math.min(a.x + a.hx, b.x + b.hx) - Math.max(a.x - a.hx, b.x - b.hx);
  const z = Math.min(a.z + a.hz, b.z + b.hz) - Math.max(a.z - a.hz, b.z - b.hz);
  if (x <= 0 || z <= 0) return 0;
  return x * z;
}

export function contains(outer: HalfBox, inner: HalfBox, slack = 0.08) {
  return (
    inner.x - inner.hx >= outer.x - outer.hx - slack &&
    inner.x + inner.hx <= outer.x + outer.hx + slack &&
    inner.z - inner.hz >= outer.z - outer.hz - slack &&
    inner.z + inner.hz <= outer.z + outer.hz + slack
  );
}

function subtract(span: [number, number], cuts: [number, number][]) {
  let parts: [number, number][] = [span];
  for (const [cutStart, cutEnd] of cuts) {
    const next: [number, number][] = [];
    for (const [start, end] of parts) {
      if (cutEnd <= start || cutStart >= end) {
        next.push([start, end]);
        continue;
      }
      if (cutStart > start) next.push([start, Math.min(cutStart, end)]);
      if (cutEnd < end) next.push([Math.max(cutEnd, start), end]);
    }
    parts = next;
  }
  return parts.filter(([start, end]) => end - start > 2.4);
}

function pushLine(out: Rect[], horizontal: boolean, x: number, z: number, length: number, thickness: number) {
  if (horizontal) out.push({ x, z, w: length, d: thickness });
  else out.push({ x, z, w: thickness, d: length });
}

/** Edge lines on every existing street, plus a second lane line on the boulevard. Broken at crossings. */
export function laneMarkings(): Rect[] {
  const out: Rect[] = [];
  for (const road of allRoads()) {
    const horizontal = road.w >= road.d;
    const span = horizontal ? road.d : road.w;
    const edge = span / 2 - 0.4;
    const offsets = span >= 16 ? [-edge, -4.4, 4.4, edge] : [-edge, edge];
    if (horizontal) {
      const parts = subtract([road.x - road.w / 2, road.x + road.w / 2], X_CUTS);
      for (const [start, end] of parts) {
        for (const offset of offsets) {
          const thickness = Math.abs(offset) === edge ? 0.14 : 0.1;
          pushLine(out, true, (start + end) / 2, road.z + offset, end - start, thickness);
        }
      }
    } else {
      const parts = subtract([road.z - road.d / 2, road.z + road.d / 2], Z_CUTS);
      for (const [start, end] of parts) {
        for (const offset of offsets) {
          const thickness = Math.abs(offset) === edge ? 0.14 : 0.1;
          pushLine(out, false, road.x + offset, (start + end) / 2, end - start, thickness);
        }
      }
    }
  }
  return out;
}

/** Planted median on the north boulevard, broken where the avenues cross. */
export function medianBeds(): Rect[] {
  const meridian = phase1.roads.find((road) => road.id === "meridian");
  if (!meridian) return [];
  return subtract([meridian.x - meridian.w / 2, meridian.x + meridian.w / 2], X_CUTS).map(([start, end]) => ({
    x: (start + end) / 2,
    z: meridian.z,
    w: end - start,
    d: 1.7,
  }));
}

/** Arrows, a turn-lane divider, and stop bars. These sit on asphalt. */
export function streetSymbols(): Rect[] {
  return [
    { x: 80, z: 111.5, w: 2.4, d: 0.18 },
    { x: 81.45, z: 111.78, w: 0.7, d: 0.16 },
    { x: 81.45, z: 111.22, w: 0.7, d: 0.16 },
    { x: 70, z: 124.5, w: 2.4, d: 0.18 },
    { x: 68.55, z: 124.78, w: 0.7, d: 0.16 },
    { x: 68.55, z: 124.22, w: 0.7, d: 0.16 },
    { x: -20, z: -126.8, w: 2.4, d: 0.18 },
    { x: -18.55, z: -126.52, w: 0.7, d: 0.16 },
    { x: -18.55, z: -127.08, w: 0.7, d: 0.16 },
    { x: 132.8, z: 20, w: 0.18, d: 2.4 },
    { x: 133.08, z: 21.45, w: 0.16, d: 0.7 },
    { x: 132.52, z: 21.45, w: 0.16, d: 0.7 },
    { x: 108, z: 115.55, w: 16, d: 0.12 },
    { x: 114, z: 116.35, w: 0.16, d: 1.2 },
    { x: 118, z: 111.5, w: 0.42, d: 3.2 },
    { x: 118, z: 115.15, w: 0.42, d: 1.8 },
    { x: -8, z: -50, w: 0.36, d: 3.4 },
    { x: 40, z: -121.2, w: 2.4, d: 0.18 },
    { x: 38.55, z: -120.92, w: 0.7, d: 0.16 },
    { x: 38.55, z: -121.48, w: 0.7, d: 0.16 },
  ];
}

export function roadPaint(): Rect[] {
  return [...laneMarkings(), ...streetSymbols()];
}
