export type MissionStage =
  | { kind: "goto"; x: number; z: number; radius: number; label: string }
  | { kind: "enter-vehicle"; vehicleId: string; label: string }
  | { kind: "goto-vehicle"; vehicleId: string; x: number; z: number; radius: number; label: string }
  | { kind: "exit-vehicle"; label: string };

export interface MissionDefinition {
  id: string;
  title: string;
  reward: number;
  stages: MissionStage[];
}

export const FIRST_FARE: MissionDefinition = {
  id: "first-fare",
  title: "First Fare",
  reward: 500,
  stages: [
    {
      kind: "goto",
      x: 48,
      z: -22,
      radius: 5,
      label: "Find the yellow cab on Pier 4",
    },
    {
      kind: "enter-vehicle",
      vehicleId: "cab",
      label: "Get in the cab",
    },
    {
      kind: "goto-vehicle",
      vehicleId: "cab",
      x: -64,
      z: 64,
      radius: 7,
      label: "Drop the fare in the Harbor Heights park",
    },
    {
      kind: "exit-vehicle",
      label: "Park and let them out",
    },
  ],
};

export interface MissionContext {
  x: number;
  z: number;
  drivingId: string | null;
}

export function stageMet(stage: MissionStage, ctx: MissionContext): boolean {
  if (stage.kind === "goto") {
    return Math.hypot(stage.x - ctx.x, stage.z - ctx.z) <= stage.radius;
  }
  if (stage.kind === "enter-vehicle") return ctx.drivingId === stage.vehicleId;
  if (stage.kind === "goto-vehicle") {
    return ctx.drivingId === stage.vehicleId && Math.hypot(stage.x - ctx.x, stage.z - ctx.z) <= stage.radius;
  }
  return ctx.drivingId === null;
}

export function stagePoint(stage: MissionStage | null): { x: number; z: number } | null {
  if (!stage) return null;
  if (stage.kind === "goto" || stage.kind === "goto-vehicle") return { x: stage.x, z: stage.z };
  if (stage.kind === "enter-vehicle") return { x: FIRST_FARE.stages[0].kind === "goto" ? FIRST_FARE.stages[0].x : 48, z: -22 };
  return { x: -64, z: 64 };
}
