/**
 * Approved world frame for The Coast.
 * Local gameplay meters stay where they are. Add the anchor to reach the masterplan.
 * North is +Z, east is +X. The numbers match docs/masterplan/world.json.
 */

export const ANCHOR = { x: 640, z: 620 } as const;
export const CHUNK_METERS = 200;
export const WORLD_BOUNDS = { x0: -3200, x1: 3200, z0: -2600, z1: 2600 } as const;

export interface DistrictRect {
  id: string;
  name: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const DISTRICTS: readonly DistrictRect[] = [
  { id: "downtown", name: "Downtown", x0: -1100, x1: 360, z0: 520, z1: 1680 },
  { id: "brickell", name: "Brickell Heights", x0: -1100, x1: 500, z0: -1100, z1: 520 },
  { id: "palm", name: "Palm Grove", x0: -3200, x1: -1100, z0: 400, z1: 2600 },
  { id: "azure", name: "Azure Shores", x0: -3200, x1: -1100, z0: -2600, z1: 400 },
  { id: "ocean", name: "Oceanfront", x0: 1500, x1: 2300, z0: -1550, z1: 1680 },
  { id: "marina", name: "Marina District", x0: 500, x1: 1500, z0: 400, z1: 1100 },
  { id: "port", name: "Portside", x0: -1100, x1: 900, z0: -2600, z1: -1100 },
  { id: "bayview", name: "Bayview Parklands", x0: -1100, x1: 2100, z0: 1680, z1: 2600 },
];

/** Near yacht basin in local meters. The north edge meets the existing shore water. */
export const NEAR_BASIN = { x0: -100, x1: 150, z0: -170, z1: -22 } as const;

export function worldFromLocal(x: number, z: number): { x: number; z: number } {
  return { x: x + ANCHOR.x, z: z + ANCHOR.z };
}

export function localFromWorld(x: number, z: number): { x: number; z: number } {
  return { x: x - ANCHOR.x, z: z - ANCHOR.z };
}

export function chunkOf(worldX: number, worldZ: number): { cx: number; cz: number } {
  return {
    cx: Math.floor((worldX - WORLD_BOUNDS.x0) / CHUNK_METERS),
    cz: Math.floor((worldZ - WORLD_BOUNDS.z0) / CHUNK_METERS),
  };
}

export function districtAt(worldX: number, worldZ: number): DistrictRect | null {
  return (
    DISTRICTS.find(
      (district) =>
        worldX >= district.x0 && worldX <= district.x1 && worldZ >= district.z0 && worldZ <= district.z1,
    ) ?? null
  );
}
