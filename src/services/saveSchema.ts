import { START_CASH, WORLD_HALF } from "@/game/engine/GameConfig";
import type { SaveGame } from "@/game/engine/types";
import { ITEM_CATALOG } from "@/game/inventory/Inventory";
import { FIRST_FARE } from "@/game/missions/Mission";
import { propertyById } from "@/game/properties/Property";
import { VEHICLE_IDS } from "@/game/vehicles/catalog";

const ITEM_IDS = new Set(ITEM_CATALOG.map((item) => item.id));

export function sanitizeSave(input: unknown): SaveGame | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SaveGame>;
  if (raw.version !== 1) return null;
  const x = finite(raw.x);
  const y = finite(raw.y);
  const z = finite(raw.z);
  const yaw = finite(raw.yaw);
  const facing = finite(raw.facing);
  if (x === null || y === null || z === null || yaw === null || facing === null) return null;
  if (Math.abs(x) > WORLD_HALF || Math.abs(z) > WORLD_HALF || y < 0 || y > 40) return null;
  if (typeof raw.cash !== "number" || !Number.isInteger(raw.cash) || raw.cash < 0 || raw.cash > 10_000_000) return null;
  const stamina = finite(raw.stamina);
  if (stamina === null || stamina < 0 || stamina > 1) return null;
  const missionComplete = raw.missionComplete === true;
  const missionIndex = raw.missionIndex;
  if (typeof missionIndex !== "number" || !Number.isInteger(missionIndex) || missionIndex < 0) return null;
  if (missionIndex > FIRST_FARE.stages.length) return null;
  if (!Array.isArray(raw.inventory) || !Array.isArray(raw.ownedPropertyIds) || !Array.isArray(raw.vehicles)) return null;

  const inventory = [];
  for (const entry of raw.inventory) {
    if (!entry || typeof entry !== "object") return null;
    const id = (entry as { id?: unknown }).id;
    const quantity = (entry as { quantity?: unknown }).quantity;
    if (typeof id !== "string" || !ITEM_IDS.has(id)) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
    inventory.push({ id, quantity });
  }

  const ownedPropertyIds = [];
  for (const id of raw.ownedPropertyIds) {
    if (typeof id !== "string" || !propertyById(id)) return null;
    ownedPropertyIds.push(id);
  }

  const vehicles = [];
  for (const pose of raw.vehicles) {
    if (!pose || typeof pose !== "object") return null;
    const id = (pose as { id?: unknown }).id;
    const vx = finite((pose as { x?: unknown }).x);
    const vz = finite((pose as { z?: unknown }).z);
    const heading = finite((pose as { heading?: unknown }).heading);
    const speed = finite((pose as { speed?: unknown }).speed);
    if (typeof id !== "string" || !VEHICLE_IDS.has(id)) return null;
    if (vx === null || vz === null || heading === null || speed === null) return null;
    if (Math.abs(vx) > WORLD_HALF || Math.abs(vz) > WORLD_HALF || Math.abs(speed) > 40) return null;
    vehicles.push({ id, x: vx, z: vz, heading, speed });
  }

  let waypoint: { x: number; z: number } | null = null;
  if (raw.waypoint) {
    const wx = finite((raw.waypoint as { x?: unknown }).x);
    const wz = finite((raw.waypoint as { z?: unknown }).z);
    if (wx === null || wz === null || Math.abs(wx) > WORLD_HALF || Math.abs(wz) > WORLD_HALF) return null;
    waypoint = { x: wx, z: wz };
  }

  const drivingId = raw.drivingId;
  if (drivingId !== null && (typeof drivingId !== "string" || !VEHICLE_IDS.has(drivingId))) return null;

  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    x,
    y,
    z,
    yaw,
    facing,
    cash: raw.cash,
    stamina,
    missionIndex,
    missionComplete,
    inventory,
    ownedPropertyIds,
    waypoint,
    drivingId: drivingId ?? null,
    vehicles,
  };
}

export function freshEconomy(): number {
  return START_CASH;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
