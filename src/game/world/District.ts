import { WORLD_HALF, ROAD_HALF } from "@/game/engine/GameConfig";
import { pointBlocked, type AABB } from "@/game/physics/Collision";

export type Palette = "civic" | "pier" | "house" | "yard";

export interface BuildingSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  palette: Palette;
}

export interface DistrictInfo {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  color: string;
}

export interface PierSpec {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface TreeSpec {
  x: number;
  z: number;
  radius: number;
}

export const DISTRICTS: DistrictInfo[] = [
  { id: "civic", name: "Civic Core", minX: -WORLD_HALF, maxX: 0, minZ: -WORLD_HALF, maxZ: 0, color: "#2a3342" },
  { id: "pier", name: "Pier 4", minX: 0, maxX: WORLD_HALF, minZ: -WORLD_HALF, maxZ: 0, color: "#243844" },
  { id: "heights", name: "Harbor Heights", minX: -WORLD_HALF, maxX: 0, minZ: 0, maxZ: WORLD_HALF, color: "#2d3a30" },
  { id: "yards", name: "The Yards", minX: 0, maxX: WORLD_HALF, minZ: 0, maxZ: WORLD_HALF, color: "#3a342c" },
];

export const SPAWN = { x: -20, z: -20, yaw: Math.atan2(-1, -1) };
export const CAB_SPAWN = { x: 48, z: -22, heading: 0.4 };
export const DROPOFF = { x: -64, z: 64 };

const CIVIC: Array<[number, number, number]> = [
  [-96, -96, 22],
  [-74, -96, 14],
  [-52, -96, 30],
  [-32, -96, 18],
  [-96, -74, 16],
  [-74, -74, 28],
  [-52, -74, 12],
  [-32, -74, 20],
  [-96, -52, 26],
  [-74, -52, 15],
  [-52, -52, 19],
  [-32, -52, 11],
  [-96, -32, 13],
  [-70, -32, 24],
  [-48, -32, 17],
];

export function buildings(): BuildingSpec[] {
  const list: BuildingSpec[] = CIVIC.map(([x, z, h], index) => {
    const loft = x === -74 && z === -74;
    return {
      id: loft ? "loft-tower" : `civic-${index}`,
      x,
      z,
      w: loft ? 16 : 13,
      d: loft ? 16 : 13,
      h,
      palette: "civic",
    };
  });

  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      if (i === 2 && j === 2) continue;
      list.push({
        id: `house-${i}-${j}`,
        x: -100 + i * 18,
        z: 28 + j * 18,
        w: 9,
        d: 9,
        h: 4.2 + ((i + j) % 3) * 1.4,
        palette: "house",
      });
    }
  }

  const piers: Array<[number, number, number, number, number]> = [
    [32, -36, 18, 14, 8],
    [34, -70, 20, 16, 7],
    [64, -78, 16, 18, 9],
    [72, -42, 14, 18, 8],
  ];
  piers.forEach(([x, z, w, d, h], index) => {
    list.push({ id: `shed-${index}`, x, z, w, d, h, palette: "pier" });
  });

  const yards: Array<[number, number, number, number, number]> = [
    [36, 40, 22, 16, 9],
    [74, 34, 18, 16, 12],
    [42, 80, 24, 16, 8],
    [90, 78, 16, 22, 16],
    [102, 44, 12, 24, 11],
  ];
  yards.forEach(([x, z, w, d, h], index) => {
    list.push({ id: `yard-${index}`, x, z, w, d, h, palette: "yard" });
  });

  return list;
}

export function pierDeck(): PierSpec {
  return { x: 89, z: -14, w: 22, d: 12 };
}

export function trees(): TreeSpec[] {
  return [
    { x: -76, z: 58, radius: 0.45 },
    { x: -52, z: 58, radius: 0.4 },
    { x: -70, z: 74, radius: 0.45 },
    { x: -54, z: 72, radius: 0.35 },
    { x: -86, z: 86, radius: 0.5 },
  ];
}

export function lampPosts(): { x: number; z: number }[] {
  const posts: { x: number; z: number }[] = [];
  for (const x of [-14, 14]) {
    for (const z of [-14, 14]) posts.push({ x, z });
  }
  for (let i = -3; i <= 3; i += 1) {
    if (i === 0) continue;
    posts.push({ x: i * 28, z: 14 });
    posts.push({ x: i * 28, z: -14 });
    posts.push({ x: 14, z: i * 28 });
    posts.push({ x: -14, z: i * 28 });
  }
  return posts;
}

export function waterZones(): AABB[] {
  return [
    { id: "sea-west", minX: 80, maxX: WORLD_HALF + 8, minZ: -WORLD_HALF - 8, maxZ: -20 },
    { id: "sea-east", minX: 80, maxX: WORLD_HALF + 8, minZ: -8, maxZ: 2 },
    { id: "sea-end", minX: 100, maxX: WORLD_HALF + 8, minZ: -20, maxZ: -8 },
  ];
}

export function worldBounds(): AABB[] {
  const h = WORLD_HALF;
  const t = 10;
  return [
    { id: "bound-n", minX: -h - t, maxX: h + t, minZ: -h - t, maxZ: -h },
    { id: "bound-s", minX: -h - t, maxX: h + t, minZ: h, maxZ: h + t },
    { id: "bound-w", minX: -h - t, maxX: -h, minZ: -h - t, maxZ: h + t },
    { id: "bound-e", minX: h, maxX: h + t, minZ: -h - t, maxZ: h + t },
  ];
}

export function buildingBox(building: BuildingSpec): AABB {
  return {
    id: building.id,
    minX: building.x - building.w / 2,
    maxX: building.x + building.w / 2,
    minZ: building.z - building.d / 2,
    maxZ: building.z + building.d / 2,
  };
}

export function staticColliders(): AABB[] {
  const boxes = buildings().map(buildingBox);
  for (const tree of trees()) {
    boxes.push({
      id: `tree-${tree.x}-${tree.z}`,
      minX: tree.x - tree.radius,
      maxX: tree.x + tree.radius,
      minZ: tree.z - tree.radius,
      maxZ: tree.z + tree.radius,
    });
  }
  boxes.push(
    { id: "crate-a", minX: 39.2, maxX: 41.2, minZ: -19.2, maxZ: -17.2 },
    { id: "crate-b", minX: 41.4, maxX: 43, minZ: -18.4, maxZ: -16.8 },
  );
  boxes.push(...waterZones(), ...worldBounds());
  return boxes;
}

export function districtAt(x: number, z: number): DistrictInfo {
  if (Math.abs(x) < ROAD_HALF + 2 && Math.abs(z) < ROAD_HALF + 2) {
    return { id: "crossing", name: "The Crossing", minX: -10, maxX: 10, minZ: -10, maxZ: 10, color: "#2a3038" };
  }
  return (
    DISTRICTS.find((district) => x >= district.minX && x < district.maxX && z >= district.minZ && z < district.maxZ) ??
    DISTRICTS[0]
  );
}

export function blockedByCity(x: number, z: number, radius = 0.4): boolean {
  return pointBlocked(x, z, radius, staticColliders());
}

export function sidewalkRoutes(): { x: number; z: number }[][] {
  return [
    [
      { x: -16, z: -16 },
      { x: -108, z: -16 },
      { x: -108, z: -108 },
      { x: -16, z: -108 },
    ],
    [
      { x: -16, z: 16 },
      { x: -108, z: 16 },
      { x: -108, z: 108 },
      { x: -16, z: 108 },
    ],
    [
      { x: 16, z: -16 },
      { x: 16, z: -108 },
      { x: 48, z: -108 },
      { x: 48, z: -96 },
    ],
    [
      { x: 16, z: 16 },
      { x: 108, z: 16 },
      { x: 108, z: 108 },
      { x: 16, z: 108 },
    ],
  ];
}
