import { PACKAGE_IDS, STARTING_CASH, isPackageId, type DeliveryStatus, type PackageId } from "@/game/missions/firstOpportunity";

export interface CoastSave {
  version: 1;
  cash: number;
  status: DeliveryStatus;
  packages: PackageId[];
}

const STATUSES: readonly DeliveryStatus[] = ["available", "active", "complete"];

export function sanitizeCoastSave(input: unknown): CoastSave | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<CoastSave>;
  if (raw.version !== 1) return null;
  if (typeof raw.cash !== "number" || !Number.isInteger(raw.cash) || raw.cash < 0 || raw.cash > 10_000_000) return null;
  if (typeof raw.status !== "string" || !STATUSES.includes(raw.status as DeliveryStatus)) return null;
  if (!Array.isArray(raw.packages)) return null;

  const packages: PackageId[] = [];
  for (const id of raw.packages) {
    if (typeof id !== "string" || !isPackageId(id) || packages.includes(id)) return null;
    packages.push(id);
  }

  const status = raw.status as DeliveryStatus;
  if (status === "available" && packages.length > 0) return null;
  if (status === "complete" && packages.length !== PACKAGE_IDS.length) return null;
  return { version: 1, cash: raw.cash, status, packages };
}

export function readCoastSave(profileId: string): CoastSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(profileId));
    if (!raw) return null;
    return sanitizeCoastSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeCoastSave(profileId: string, save: CoastSave): void {
  if (typeof window === "undefined") return;
  const clean = sanitizeCoastSave(save);
  if (!clean) return;
  window.localStorage.setItem(storageKey(profileId), JSON.stringify(clean));
}

export function storageKey(profileId: string): string {
  return `coast-save-v1:${profileId}`;
}

export function freshCash(): number {
  return STARTING_CASH;
}
