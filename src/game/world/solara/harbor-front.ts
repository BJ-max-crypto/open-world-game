/** One finished street: the harbor approach in front of Solara, and the plaza it meets. */

export interface Box {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Piece extends Box {
  y: number;
  h: number;
  kind: string;
}

export const STUDY = { minX: -58, maxX: 58, minZ: -60, maxZ: -16.85 };
export const CURB_HEIGHT = 0.12;

/** Pool copings on the Solara apron. Three.js z is the opposite of the Blender plan. */
export const POOLS: Box[] = [
  { x: -11.5, z: -20.9, w: 7.2, d: 5.7 },
  { x: 11.5, z: -20.9, w: 7.2, d: 5.7 },
];

const SIDEWALK: Box[] = [
  { x: 0, z: -42.85, w: 92, d: 5.4 },
  { x: -45.5, z: -39.2, w: 3.8, d: 12.4 },
  { x: 45.5, z: -39.2, w: 3.8, d: 12.4 },
  { x: 0, z: -56.75, w: 96, d: 4.9 },
  { x: -45.6, z: -57.1, w: 3.6, d: 4.2 },
  { x: 45.6, z: -57.1, w: 3.6, d: 4.2 },
];

const MORTAR: Box[] = [
  { x: 0, z: -32.3, w: 69, d: 16.7 },
  { x: 0, z: -20.35, w: 14.4, d: 6.8 },
  { x: -24.8, z: -20.35, w: 18.8, d: 6.8 },
  { x: 24.8, z: -20.35, w: 18.8, d: 6.8 },
  { x: -39.0, z: -36.6, w: 9.2, d: 7.2 },
  { x: 39.4, z: -36.5, w: 8.4, d: 7.2 },
];

export const BEDS: Box[] = [
  { x: -24, z: -39.45, w: 9.2, d: 2.15 },
  { x: -7.2, z: -39.55, w: 4.6, d: 1.9 },
  { x: 12.4, z: -39.35, w: 7.4, d: 2.25 },
  { x: 25.2, z: -39.6, w: 6.2, d: 1.85 },
  { x: -20.5, z: -30.2, w: 5.6, d: 4.2 },
  { x: 22.4, z: -31.2, w: 5.2, d: 3.8 },
  { x: -38.5, z: -36.4, w: 4.2, d: 3.1 },
  { x: 40.6, z: -35.7, w: 2.8, d: 3.6 },
  { x: -16.5, z: -57.5, w: 7.4, d: 1.45 },
  { x: 9.2, z: -57.35, w: 4.8, d: 1.35 },
  { x: 24.5, z: -57.6, w: 6.6, d: 1.5 },
];

function hitsPool(piece: Box, pad = 0.18) {
  return POOLS.some(
    (pool) =>
      Math.abs(piece.x - pool.x) < piece.w / 2 + pool.w / 2 + pad &&
      Math.abs(piece.z - pool.z) < piece.d / 2 + pool.d / 2 + pad,
  );
}

function fill(rects: Box[], pitchX: number, pitchZ: number, sizeX: number, sizeZ: number, y: number, h: number, kind: string) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x - rect.w / 2);
    maxX = Math.max(maxX, rect.x + rect.w / 2);
    minZ = Math.min(minZ, rect.z - rect.d / 2);
    maxZ = Math.max(maxZ, rect.z + rect.d / 2);
  }
  const pieces: Piece[] = [];
  let row = 0;
  for (let z = minZ + pitchZ / 2; z <= maxZ; z += pitchZ) {
    const shift = row % 2 === 0 ? 0 : pitchX / 2;
    row += 1;
    for (let x = minX + shift + sizeX / 2; x <= maxX; x += pitchX) {
      const piece: Piece = { x, z, w: sizeX, d: sizeZ, y, h, kind };
      if (!rects.some((rect) => Math.abs(piece.x - rect.x) <= rect.w / 2 && Math.abs(piece.z - rect.z) <= rect.d / 2)) continue;
      if (hitsPool(piece)) continue;
      pieces.push(piece);
    }
  }
  return pieces;
}

function overlaps(a: Box, b: Box, inset = 0) {
  return (
    Math.abs(a.x - b.x) < a.w / 2 + b.w / 2 - inset &&
    Math.abs(a.z - b.z) < a.d / 2 + b.d / 2 - inset
  );
}

const RUNNER: Box = { x: 0, z: -28.7, w: 2.7, d: 22.8 };

function curbAlongX(x0: number, x1: number, z: number): Piece {
  return { x: (x0 + x1) / 2, z, w: Math.abs(x1 - x0), d: 0.22, y: 0.12, h: CURB_HEIGHT, kind: "curb" };
}

function curbAlongZ(z0: number, z1: number, x: number): Piece {
  return { x, z: (z0 + z1) / 2, w: 0.22, d: Math.abs(z1 - z0), y: 0.12, h: CURB_HEIGHT, kind: "curb" };
}

export function harborLayout() {
  const mortar = [...MORTAR, ...SIDEWALK].map(
    (box): Piece => ({ ...box, y: 0.062, h: 0.012, kind: "mortar" }),
  );
  const clearOfWalk = (piece: Piece) => !SIDEWALK.some((walk) => overlaps(piece, walk, 0.04));
  const inStudy = (piece: Piece) =>
    piece.x - piece.w / 2 >= STUDY.minX &&
    piece.x + piece.w / 2 <= STUDY.maxX &&
    piece.z - piece.d / 2 >= STUDY.minZ &&
    piece.z + piece.d / 2 <= STUDY.maxZ;
  const pavers = [
    ...fill(MORTAR, 0.66, 0.66, 0.62, 0.62, 0.078, 0.018, "paver").filter((piece) => clearOfWalk(piece) && inStudy(piece)),
    ...fill([RUNNER], 0.52, 1.05, 0.46, 0.98, 0.086, 0.016, "runner").filter((piece) => clearOfWalk(piece) && inStudy(piece)),
  ];
  const sidewalk = fill(SIDEWALK, 1.02, 0.82, 0.96, 0.76, 0.082, 0.02, "sidewalk").filter(inStudy);
  const curbs = [
    curbAlongX(-47.5, -4.1, -45.72),
    curbAlongX(4.1, 14.6, -45.72),
    curbAlongX(23.6, 47.5, -45.72),
    curbAlongZ(-45.72, -33.2, -47.55),
    curbAlongZ(-45.72, -33.2, 47.55),
    curbAlongX(-47.5, -4.1, -54.32),
    curbAlongX(4.1, 47.5, -54.32),
    curbAlongZ(-59.0, -54.32, -47.55),
    curbAlongZ(-59.0, -54.32, 47.55),
  ];
  const ramps: Piece[] = [
    { x: 0, z: -45.85, w: 6.4, d: 1.35, y: 0.055, h: 0.04, kind: "ramp" },
    { x: -45.6, z: -45.85, w: 3.2, d: 1.2, y: 0.055, h: 0.04, kind: "ramp" },
    { x: 45.6, z: -45.85, w: 3.2, d: 1.2, y: 0.055, h: 0.04, kind: "ramp" },
    { x: 19.2, z: -44.7, w: 7.6, d: 2.3, y: 0.07, h: 0.02, kind: "apron" },
  ];
  const gutters: Piece[] = [
    { x: 0, z: -46.08, w: 92, d: 0.42, y: 0.05, h: 0.012, kind: "gutter" },
    { x: 0, z: -53.95, w: 92, d: 0.5, y: 0.05, h: 0.012, kind: "gutter" },
  ];
  const beds = BEDS.map((bed): Piece => ({ ...bed, y: 0.1, h: 0.03, kind: "soil" }));
  return { mortar, pavers, sidewalk, curbs, ramps, gutters, beds };
}

export const SHRUBS: { x: number; z: number; s: number; tint: number }[] = [
  { x: -26.4, z: -39.5, s: 0.55, tint: 0 },
  { x: -23.2, z: -39.15, s: 0.38, tint: 1 },
  { x: -21.4, z: -39.7, s: 0.46, tint: 2 },
  { x: -8.4, z: -39.5, s: 0.42, tint: 1 },
  { x: -6.1, z: -39.25, s: 0.3, tint: 0 },
  { x: 10.2, z: -39.15, s: 0.5, tint: 0 },
  { x: 12.8, z: -39.6, s: 0.34, tint: 2 },
  { x: 14.6, z: -39.2, s: 0.28, tint: 1 },
  { x: 23.4, z: -39.55, s: 0.44, tint: 0 },
  { x: 26.2, z: -39.3, s: 0.32, tint: 1 },
  { x: -22.2, z: -31.2, s: 0.62, tint: 0 },
  { x: -19.4, z: -29.4, s: 0.4, tint: 1 },
  { x: -20.8, z: -28.8, s: 0.28, tint: 2 },
  { x: 21.2, z: -32.2, s: 0.5, tint: 0 },
  { x: 23.6, z: -30.4, s: 0.36, tint: 1 },
  { x: 22.2, z: -30.0, s: 0.24, tint: 2 },
  { x: -39.4, z: -36.8, s: 0.48, tint: 0 },
  { x: -37.6, z: -35.6, s: 0.3, tint: 2 },
  { x: 40.4, z: -36.4, s: 0.4, tint: 1 },
  { x: 41.2, z: -34.2, s: 0.26, tint: 0 },
  { x: -18.4, z: -57.55, s: 0.36, tint: 0 },
  { x: -15.2, z: -57.3, s: 0.24, tint: 2 },
  { x: 8.4, z: -57.4, s: 0.32, tint: 1 },
  { x: 23.2, z: -57.7, s: 0.4, tint: 0 },
  { x: 26.2, z: -57.4, s: 0.22, tint: 2 },
];

export const ROCKS: { x: number; z: number; w: number; d: number; yaw: number }[] = [
  { x: -25.1, z: -39.85, w: 0.42, d: 0.28, yaw: 0.4 },
  { x: 11.2, z: -39.7, w: 0.36, d: 0.22, yaw: 1.1 },
  { x: -21.6, z: -30.6, w: 0.5, d: 0.32, yaw: 0.7 },
  { x: 23.8, z: -31.6, w: 0.34, d: 0.24, yaw: 1.6 },
];

export const TUFTS: { x: number; z: number; w: number; d: number }[] = [
  { x: -24.6, z: -39.2, w: 1.1, d: 0.7 },
  { x: 13.4, z: -39.4, w: 0.9, d: 0.55 },
  { x: -19.8, z: -30.8, w: 1.3, d: 0.8 },
  { x: 22.8, z: -31.8, w: 1.0, d: 0.6 },
];

export const FRONT_PALMS: { x: number; z: number; s: number; yaw: number }[] = [
  { x: -27.2, z: -39.4, s: 0.92, yaw: 0.4 },
  { x: -5.4, z: -39.5, s: 0.74, yaw: 1.8 },
  { x: 15.8, z: -39.3, s: 1.02, yaw: 0.7 },
  { x: 27.4, z: -39.55, s: 0.8, yaw: 2.3 },
  { x: -38.2, z: -36.2, s: 0.86, yaw: 1.2 },
  { x: 40.8, z: -35.6, s: 0.7, yaw: 2.6 },
  { x: -16.8, z: -57.45, s: 0.78, yaw: 0.6 },
  { x: 25.4, z: -57.55, s: 0.9, yaw: 1.7 },
];

export const LAMPS = [
  ...[-34, -14, 16, 38].map((x) => ({ x, z: -44.15 })),
  { x: -22, z: -57.85 },
  { x: 18, z: -57.65 },
];

export const BENCHES: { x: number; z: number; yaw: number }[] = [
  { x: -8.6, z: -36.4, yaw: 0.08 },
  { x: 8.4, z: -35.1, yaw: -0.12 },
];

export const SEATS: { x: number; z: number }[] = [
  { x: 7.4, z: -33.6 },
  { x: -7.6, z: -32.4 },
];

export const PATH_LIGHTS = [
  { x: 4.5, z: -34.2 },
  { x: -4.5, z: -30.4 },
  { x: 4.5, z: -26.6 },
  { x: -4.5, z: -23.2 },
];

export const SIGNALS = [
  { x: -46.7, z: -44.9 },
  { x: 46.7, z: -44.9 },
];
