import {
  FIRST_FARE,
  stageMet,
  stagePoint,
  type MissionContext,
  type MissionDefinition,
  type MissionStage,
} from "@/game/missions/Mission";

export class MissionManager {
  private index: number;
  private done: boolean;

  constructor(
    private readonly def: MissionDefinition = FIRST_FARE,
    index = 0,
    done = false,
  ) {
    this.done = done;
    this.index = done ? def.stages.length : clampIndex(index, def.stages.length);
  }

  get complete(): boolean {
    return this.done;
  }

  get title(): string {
    return this.def.title;
  }

  get stageIndex(): number {
    return this.index;
  }

  get stage(): MissionStage | null {
    if (this.done) return null;
    return this.def.stages[this.index] ?? null;
  }

  get objective(): string | null {
    return this.stage?.label ?? null;
  }

  objectivePoint(): { x: number; z: number } | null {
    return stagePoint(this.stage);
  }

  /** Advances at most one stage. Returns the cash reward when the mission finishes. */
  update(ctx: MissionContext): number {
    if (this.done) return 0;
    const stage = this.def.stages[this.index];
    if (!stage || !stageMet(stage, ctx)) return 0;
    this.index += 1;
    if (this.index >= this.def.stages.length) {
      this.done = true;
      return this.def.reward;
    }
    return 0;
  }
}

function clampIndex(index: number, length: number): number {
  if (!Number.isInteger(index) || index < 0) return 0;
  return Math.min(index, length);
}
