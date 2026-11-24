/** Mission 001. Pure state: the UI cannot pay the player by itself. */

export const MISSION_TITLE = "A First Opportunity";
export const PACKAGE_IDS = ["pkg-a", "pkg-b", "pkg-c"] as const;
export const DELIVERY_REWARD = 500;
export const STARTING_CASH = 250;

export type PackageId = (typeof PACKAGE_IDS)[number];
export type DeliveryStatus = "available" | "active" | "complete";

export interface DeliveryState {
  status: DeliveryStatus;
  collected: PackageId[];
}

export function createDelivery(): DeliveryState {
  return { status: "available", collected: [] };
}

export function isPackageId(id: string): id is PackageId {
  return (PACKAGE_IDS as readonly string[]).includes(id);
}

export function packagesReady(state: DeliveryState): boolean {
  return PACKAGE_IDS.every((id) => state.collected.includes(id));
}

export function objectiveFor(state: DeliveryState): string {
  if (state.status === "available") return "Meet Inez Calder at the marina.";
  if (state.status === "complete") return "Paid. The waterfront is quiet.";
  if (packagesReady(state)) return "Return the packages to Inez.";
  return "Collect the three packages at Warehouse 3.";
}

export function waypointKind(state: DeliveryState): "none" | "warehouse" | "contact" {
  if (state.status !== "active") return "none";
  return packagesReady(state) ? "contact" : "warehouse";
}

/** Accept only from the offered state. A second accept does not reset progress. */
export function acceptDelivery(state: DeliveryState): DeliveryState {
  if (state.status !== "available") return state;
  return { status: "active", collected: [] };
}

/** Packages can be picked up only while the job is active, and only once. */
export function collectPackage(state: DeliveryState, id: string): DeliveryState {
  if (state.status !== "active" || !isPackageId(id) || state.collected.includes(id)) return state;
  return { status: "active", collected: [...state.collected, id] };
}

/**
 * Pays only when every package is in and the job is still active.
 * The returned state is complete, so a second call pays nothing.
 */
export function turnInDelivery(state: DeliveryState): { state: DeliveryState; reward: number } {
  if (state.status !== "active" || !packagesReady(state)) return { state, reward: 0 };
  return { state: { status: "complete", collected: [...state.collected] }, reward: DELIVERY_REWARD };
}
