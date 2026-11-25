/**
 * Paths for people, cars, and boats. Coordinates match layout.ts.
 * North is +Z. The coast road is the southern east-west street.
 */

export interface PathPoint {
  x: number;
  z: number;
  /** Wait here until this road's traffic is stopped. */
  hold?: "coast" | "inland";
  /** Walk into this doorway, then leave the sidewalk for a while. */
  door?: { x: number; z: number };
  talk?: boolean;
}

export interface WalkLoop {
  id: string;
  points: PathPoint[];
}

export interface Lane {
  id: string;
  /** Constant Z when the lane runs east-west. */
  z?: number;
  /** Constant X when the lane runs north-south. */
  x?: number;
  from: number;
  to: number;
  road: "coast" | "inland" | "cross";
}

export interface BoatPath {
  id: string;
  z: number;
  from: number;
  to: number;
}

export const PARK = { x: 0, z: 27.2, w: 14, d: 8 };
export const SHORE_Z = -24;

export const WALKS: WalkLoop[] = [
  {
    id: "promenade",
    points: [
      { x: -38, z: -18.6 },
      { x: -8, z: -18.6, talk: true },
      { x: 0, z: -18.6, hold: "coast" },
      { x: 0, z: -8.4 },
      { x: 36, z: -8.4 },
      { x: 36, z: -18.6 },
      { x: 8, z: -18.6 },
      { x: 0, z: -18.6, hold: "coast" },
      { x: 0, z: -8.4 },
      { x: -28, z: -8.4, door: { x: -28, z: -4.3 } },
      { x: -38, z: -8.4 },
    ],
  },
  {
    id: "frontage",
    points: [
      { x: -36, z: -8.35 },
      { x: -13, z: -8.35, door: { x: -13, z: -3.8 } },
      { x: 16, z: -8.35 },
      { x: 33, z: -8.35, door: { x: 33, z: -4.1 } },
      { x: 40, z: -8.35 },
      { x: 40, z: -7.5 },
      { x: -36, z: -7.5 },
    ],
  },
  {
    id: "inland",
    points: [
      { x: -36, z: 11.15 },
      { x: 0, z: 11.15, hold: "inland" },
      { x: 0, z: 20.2 },
      { x: 34, z: 20.2 },
      { x: 34, z: 11.15 },
      { x: 0, z: 11.15, hold: "inland" },
      { x: 0, z: 20.2 },
      { x: -36, z: 20.2 },
    ],
  },
];

export const LANES: Lane[] = [
  { id: "coast-east", z: -10.7, from: -40, to: 40, road: "coast" },
  { id: "coast-west", z: -13.1, from: 40, to: -40, road: "coast" },
  { id: "inland-east", z: 14.1, from: -40, to: 40, road: "inland" },
  { id: "inland-west", z: 16.2, from: 40, to: -40, road: "inland" },
  { id: "cross-north", x: 1.2, from: -7, to: 10, road: "cross" },
  { id: "cross-south", x: -1.2, from: 10, to: -7, road: "cross" },
];

export const BOAT_PATHS: BoatPath[] = [
  { id: "skiff", z: -29, from: -34, to: 30 },
  { id: "sail", z: -33.5, from: 28, to: -36 },
  { id: "ferry", z: -40, from: -20, to: 24 },
];

export const BENCHES = [
  { x: -22, z: -19.5 },
  { x: 14, z: -19.5 },
  { x: 30, z: -19.5 },
];

export function laneLength(lane: Lane): number {
  return Math.abs(lane.to - lane.from);
}

export function lanePose(lane: Lane, distance: number): { x: number; z: number; yaw: number } {
  const length = laneLength(lane);
  const wrapped = ((distance % length) + length) % length;
  const t = length === 0 ? 0 : wrapped / length;
  const dir = lane.to >= lane.from ? 1 : -1;
  if (lane.z !== undefined) {
    return { x: lane.from + (lane.to - lane.from) * t, z: lane.z, yaw: dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  return { x: lane.x ?? 0, z: lane.from + (lane.to - lane.from) * t, yaw: dir > 0 ? 0 : Math.PI };
}

/** Coast traffic moves on this phase. Cross-street traffic moves on the other one. */
export function signalPhase(time: number): "coast" | "cross" {
  const cycle = 16;
  const t = ((time % cycle) + cycle) % cycle;
  return t < 9 ? "coast" : "cross";
}

export function waveHeight(x: number, z: number, time: number): number {
  return (
    Math.sin(x * 0.16 + time * 1.05) * 0.22 +
    Math.sin(z * 0.23 - time * 0.75) * 0.14 +
    Math.sin((x + z) * 0.09 + time * 0.4) * 0.09
  );
}
