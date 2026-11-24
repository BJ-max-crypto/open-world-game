import { resolveCircle, type AABB } from "@/game/physics/Collision";

export interface VerticalState {
  y: number;
  vy: number;
  grounded: boolean;
}

export function stepVertical(state: VerticalState, dt: number, gravity: number): VerticalState {
  let { y, vy, grounded } = state;
  vy -= gravity * dt;
  y += vy * dt;
  if (y <= 0) {
    y = 0;
    vy = 0;
    grounded = true;
  } else {
    grounded = false;
  }
  return { y, vy, grounded };
}

export class PhysicsWorld {
  static: AABB[] = [];

  move(x: number, z: number, radius: number, extra: AABB[] = []): { x: number; z: number } {
    return resolveCircle({ x, z, radius }, this.static.concat(extra));
  }
}
