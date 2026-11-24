import { FOUNDATION } from "@/game/config/foundation";

/** World pose written by the character each physics step. The maps only read it. */
export interface PlayerPose {
  x: number;
  z: number;
  yaw: number;
  speed: number;
}

export function createPose(): PlayerPose {
  return {
    x: FOUNDATION.spawn[0],
    z: FOUNDATION.spawn[2],
    yaw: FOUNDATION.initialYaw,
    speed: 0,
  };
}
