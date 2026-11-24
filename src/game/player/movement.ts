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

/** Shorten the camera boom when a collider sits between the eye and the desired camera. */
export function pullCameraIn(
  distance: number,
  hitToi: number | null,
  padding: number,
  minDistance: number,
): number {
  if (hitToi == null) return distance;
  return Math.max(minDistance, Math.min(distance, hitToi - padding));
}
