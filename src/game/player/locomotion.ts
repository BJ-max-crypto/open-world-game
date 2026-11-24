export type ClipId = "idle" | "walk" | "run" | "jump" | "fall" | "land";

/** Clip names inside public/models/characters/player.glb. */
export const CLIP_NAMES: Record<ClipId, string> = {
  idle: "Idle_Loop",
  walk: "Walk_Loop",
  run: "Sprint_Loop",
  jump: "Jump_Start",
  fall: "Jump_Loop",
  land: "Jump_Land",
};

export const LOOPING_CLIPS = new Set<ClipId>(["idle", "walk", "run", "fall"]);

export interface ClipState {
  clip: ClipId;
  land: number;
}

export interface MotionSample {
  speed: number;
  vertical: number;
  grounded: boolean;
  sprinting: boolean;
}

const LAND_TIME = 0.34;

export function nextClip(state: ClipState, motion: MotionSample, dt: number): ClipState {
  if (!motion.grounded) {
    return { clip: motion.vertical > 0.4 ? "jump" : "fall", land: 0 };
  }
  if (state.clip === "jump" || state.clip === "fall") {
    return { clip: "land", land: LAND_TIME };
  }
  if (state.clip === "land") {
    const land = state.land - dt;
    if (land > 0) return { clip: "land", land };
  }
  if (motion.sprinting && motion.speed > 2.2) return { clip: "run", land: 0 };
  if (motion.speed > 0.35) return { clip: "walk", land: 0 };
  return { clip: "idle", land: 0 };
}

/** Match the clip to travel speed so the feet do not skate. */
export function clipTimeScale(clip: ClipId, speed: number): number {
  if (clip === "walk") return clamp(speed / 1.55, 0.7, 1.25);
  if (clip === "run") return clamp(speed / 4.3, 0.75, 1.25);
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
