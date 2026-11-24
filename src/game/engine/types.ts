export interface Vec2 {
  x: number;
  z: number;
}

export type Panel = "none" | "pause" | "map" | "management";

export interface PropertyView {
  id: string;
  name: string;
  price: number;
  blurb: string;
  owned: boolean;
  x: number;
  z: number;
}

export interface ItemView {
  id: string;
  name: string;
  detail: string;
  quantity: number;
}

export interface GameSnapshot {
  ready: boolean;
  panel: Panel;
  district: string;
  cash: number;
  stamina: number;
  objective: string | null;
  missionTitle: string | null;
  missionComplete: boolean;
  prompts: { key: string; label: string }[];
  speedKmh: number;
  driving: boolean;
  x: number;
  z: number;
  yaw: number;
  waypoint: Vec2 | null;
  objectivePoint: Vec2 | null;
  properties: PropertyView[];
  inventory: ItemView[];
  callsign: string;
  notice: string | null;
  settled: boolean;
  nearPropertyId: string | null;
}

export interface SaveGame {
  version: 1;
  updatedAt: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  facing: number;
  cash: number;
  stamina: number;
  missionIndex: number;
  missionComplete: boolean;
  inventory: { id: string; quantity: number }[];
  ownedPropertyIds: string[];
  waypoint: Vec2 | null;
  drivingId: string | null;
  vehicles: { id: string; x: number; z: number; heading: number; speed: number }[];
}
