export interface Planar {
  x: number;
  z: number;
}

export interface MoveInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

/** Camera-relative basis. Yaw 0 looks toward -Z, with +X on the right. */
export function cameraBasis(yaw: number): { forward: Planar; right: Planar } {
  return {
    forward: { x: -Math.sin(yaw), z: -Math.cos(yaw) },
    right: { x: Math.cos(yaw), z: -Math.sin(yaw) },
  };
}

/**
 * Ease a ground velocity toward `wish` times `targetSpeed`.
 * `wish` is a unit vector, or zero when there is no direction.
 * `rate` is acceleration or deceleration in meters per second squared.
 */
export function approachVelocity(
  current: Planar,
  wish: Planar,
  targetSpeed: number,
  rate: number,
  dt: number,
): Planar {
  const targetX = wish.x * targetSpeed;
  const targetZ = wish.z * targetSpeed;
  const dx = targetX - current.x;
  const dz = targetZ - current.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= rate * dt) return { x: targetX, z: targetZ };
  const step = (rate * dt) / distance;
  return { x: current.x + dx * step, z: current.z + dz * step };
}

/** Unit wish direction on the ground plane. Opposite keys cancel. */
export function wishDirection(yaw: number, input: MoveInput): Planar {
  const { forward, right } = cameraBasis(yaw);
  let x = 0;
  let z = 0;
  if (input.forward) {
    x += forward.x;
    z += forward.z;
  }
  if (input.back) {
    x -= forward.x;
    z -= forward.z;
  }
  if (input.right) {
    x += right.x;
    z += right.z;
  }
  if (input.left) {
    x -= right.x;
    z -= right.z;
  }
  const length = Math.hypot(x, z);
  if (length < 1e-6) return { x: 0, z: 0 };
  return { x: x / length, z: z / length };
}

export type Flight = "ground" | "rise" | "hover" | "fall";

/**
 * Temporary lift. Hold Space to climb, release to hover, double-tap Space to drop.
 * `suppressRise` keeps the second tap of a double-tap from climbing again while it is still held.
 * Walking off a ledge falls. A double-tap on the ground stays on the ground.
 */
export function stepFlight(
  flight: Flight,
  grounded: boolean,
  spaceHeld: boolean,
  spaceDouble: boolean,
  suppressRise: boolean,
): { flight: Flight; suppressRise: boolean } {
  if (spaceDouble) {
    return grounded
      ? { flight: "ground", suppressRise: false }
      : { flight: "fall", suppressRise: true };
  }
  if (suppressRise && spaceHeld) return { flight: "fall", suppressRise: true };
  if (spaceHeld) return { flight: "rise", suppressRise: false };
  if (flight === "rise" || flight === "hover") return { flight: "hover", suppressRise: false };
  if (flight === "fall" || (flight === "ground" && !grounded)) {
    return { flight: grounded ? "ground" : "fall", suppressRise: false };
  }
  return { flight: "ground", suppressRise: false };
}

export function stepVerticalVelocity(
  vy: number,
  grounded: boolean,
  jump: boolean,
  gravity: number,
  dt: number,
  jumpVelocity: number,
): number {
  let next = vy + gravity * dt;
  if (grounded && next < 0) next = 0;
  if (jump && grounded) next = jumpVelocity;
  return next;
}

/** Yaw that points a mesh's +Z axis along a ground direction. */
export function yawToward(x: number, z: number): number {
  return Math.atan2(x, z);
}

export function dampAngle(current: number, target: number, sharpness: number, dt: number): number {
  let delta = target - current;
  const turn = Math.PI * 2;
  delta = ((((delta + Math.PI) % turn) + turn) % turn) - Math.PI;
  return current + delta * (1 - Math.exp(-sharpness * dt));
}

export function cameraOffset(yaw: number, pitch: number, distance: number): { x: number; y: number; z: number } {
  const horizontal = Math.cos(pitch) * distance;
  return {
    x: Math.sin(yaw) * horizontal,
    y: Math.sin(pitch) * distance,
    z: Math.cos(yaw) * horizontal,
  };
}

/**
 * Where to put the camera after a ray that started `shift` meters in front of
 * the eye (toward the character, away from the camera). A close wall wins over
 * `minDistance`, so the camera stays on the near side of the surface.
 * `along` is measured from `origin`: "eye", or "shifted" when the eye is
 * already against or inside the hit.
 */
export function cameraClearance(
  distance: number,
  hitToi: number | null,
  shift: number,
  padding: number,
  minDistance: number,
): { origin: "eye" | "shifted"; along: number } {
  if (hitToi == null) return { origin: "eye", along: distance };
  const fromEye = hitToi - shift - padding;
  if (fromEye >= minDistance) return { origin: "eye", along: Math.min(distance, fromEye) };
  const beforeHit = Math.max(0.08, hitToi - padding);
  return { origin: "shifted", along: Math.min(beforeHit, distance + shift) };
}
