/**
 * Placeholder blockout for the first waterfront district.
 * Positions and sizes are the source for both meshes and Rapier colliders,
 * so a later glTF model can replace the mesh and keep this footprint.
 */

export interface Footprint {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export type SolidKind = "building" | "barrier" | "vehicle" | "trunk" | "crate" | "person" | "pole";

export interface Solid extends Footprint {
  y: number;
  h: number;
  kind: SolidKind;
  color: string;
  accent?: string;
  label?: string;
  /** Which face carries the name, toward the approach. */
  sign?: "south" | "west";
}

export const CONTACT = { id: "inez", x: -14, z: -19.6 };
export const SPAWN = { x: -6, y: 1.7, z: -19.6 };
export const WAREHOUSE_POINT = { x: 10, z: 28 };
export const PACKAGES = [
  { id: "pkg-a", x: 8, z: 25 },
  { id: "pkg-b", x: 8, z: 31 },
  { id: "pkg-c", x: 12.5, z: 28 },
] as const;

export const ROADS: Footprint[] = [
  { id: "coast-road", x: 0, z: -12.5, w: 90, d: 7 },
  { id: "inland-road", x: 0, z: 15.5, w: 90, d: 7 },
  { id: "cross-road", x: 0, z: 1.5, w: 7, d: 35 },
];

const STUCCO = "#d7d0c6";
const SAND = "#c6b7a2";
const GLASS = "#7f97a3";
const STEEL = "#8a847c";
const CONCRETE = "#b7b2a8";

export const SOLIDS: Solid[] = [
  { id: "seawall", x: 0, z: -23.55, w: 96, d: 0.7, y: 0.36, h: 0.72, kind: "barrier", color: CONCRETE },
  { id: "bound-west", x: -47.6, z: 7, w: 0.8, d: 62, y: 1.3, h: 2.6, kind: "barrier", color: "#5c584f" },
  { id: "bound-east", x: 47.6, z: 7, w: 0.8, d: 62, y: 1.3, h: 2.6, kind: "barrier", color: "#5c584f" },
  { id: "bound-north", x: 0, z: 37.6, w: 96, d: 0.8, y: 1.3, h: 2.6, kind: "barrier", color: "#5c584f" },
  {
    id: "marina-office",
    x: -28,
    z: 0.5,
    w: 16,
    d: 9,
    y: 2.7,
    h: 5.4,
    kind: "building",
    color: GLASS,
    accent: "#d5ddd8",
    label: "MARINA OFFICE",
    sign: "south",
  },
  {
    id: "salt-cafe",
    x: -13,
    z: 0,
    w: 7.5,
    d: 7,
    y: 1.9,
    h: 3.8,
    kind: "building",
    color: SAND,
    accent: "#8f3f36",
    label: "SALT",
    sign: "south",
  },
  {
    id: "harbor-house",
    x: 16,
    z: 1.2,
    w: 12,
    d: 11,
    y: 8.2,
    h: 16.4,
    kind: "building",
    color: STUCCO,
    accent: "#6e584c",
    label: "HARBOR HOUSE",
    sign: "south",
  },
  {
    id: "market",
    x: 33,
    z: 0.2,
    w: 13,
    d: 8,
    y: 2.5,
    h: 5,
    kind: "building",
    color: "#e4ddd2",
    accent: "#3d4c59",
    label: "MARKET",
    sign: "south",
  },
  {
    id: "yard-shop",
    x: -26,
    z: 28,
    w: 16,
    d: 12,
    y: 3.4,
    h: 6.8,
    kind: "building",
    color: "#9a8f84",
    accent: "#4d463f",
    label: "YARD SHOP",
    sign: "south",
  },
  {
    id: "warehouse-3",
    x: 28,
    z: 28,
    w: 22,
    d: 14,
    y: 4.2,
    h: 8.4,
    kind: "building",
    color: STEEL,
    accent: "#3a403f",
    label: "WAREHOUSE 3",
    sign: "west",
  },
  { id: "car-west", x: -30, z: -14.3, w: 4.6, d: 1.85, y: 0.7, h: 1.4, kind: "vehicle", color: "#3e4c59" },
  { id: "car-east", x: 24, z: -10.7, w: 4.5, d: 1.85, y: 0.68, h: 1.36, kind: "vehicle", color: "#8c3f38" },
  { id: "car-inland-west", x: -16, z: 17.1, w: 4.5, d: 1.85, y: 0.72, h: 1.44, kind: "vehicle", color: "#d9d3c8" },
  { id: "car-inland-east", x: 18, z: 13.9, w: 4.4, d: 1.85, y: 0.7, h: 1.4, kind: "vehicle", color: "#1e242b" },
  { id: "inez", x: CONTACT.x, z: CONTACT.z, w: 0.5, d: 0.5, y: 0.88, h: 1.76, kind: "person", color: "#24343c" },
  ...PACKAGES.map((pkg) => ({
    id: pkg.id,
    x: pkg.x,
    z: pkg.z,
    w: 0.7,
    d: 0.7,
    y: 0.28,
    h: 0.56,
    kind: "crate" as const,
    color: "#a7845c",
  })),
  { id: "palm-marina", x: -10, z: -21.35, w: 0.42, d: 0.42, y: 1.5, h: 3, kind: "trunk", color: "#7d6248" },
  { id: "palm-near", x: -2, z: -21.35, w: 0.42, d: 0.42, y: 1.5, h: 3, kind: "trunk", color: "#7d6248" },
  ...[-42, -34, -22, 6, 14, 22, 36, 44].map((x, index) => ({
    id: `palm-${index}`,
    x,
    z: -20.6,
    w: 0.42,
    d: 0.42,
    y: 1.5,
    h: 3,
    kind: "trunk" as const,
    color: "#7d6248",
  })),
  ...[-40, -24, -8, 8, 24, 40].flatMap((x, index) => [
    {
      id: `lamp-s-${index}`,
      x,
      z: -8.55,
      w: 0.18,
      d: 0.18,
      y: 2.4,
      h: 4.8,
      kind: "pole" as const,
      color: "#2c3136",
    },
    {
      id: `lamp-n-${index}`,
      x,
      z: 11.15,
      w: 0.18,
      d: 0.18,
      y: 2.4,
      h: 4.8,
      kind: "pole" as const,
      color: "#2c3136",
    },
  ]),
  { id: "beacon", x: -32, z: -21.2, w: 0.45, d: 0.45, y: 3.2, h: 6.4, kind: "pole", color: "#d7d0c6", label: "MARINA" },
];

export function footprintsOverlap(a: Footprint, b: Footprint, gap = 0): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + gap;
}

export function pointInside(foot: Footprint, x: number, z: number, padding = 0): boolean {
  return Math.abs(foot.x - x) <= foot.w / 2 + padding && Math.abs(foot.z - z) <= foot.d / 2 + padding;
}

export function centerOnRoad(foot: Footprint): boolean {
  return ROADS.some((road) => pointInside(road, foot.x, foot.z));
}
