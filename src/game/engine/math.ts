/** Yaw 0 faces world -Z. Positive yaw is a left turn, toward -X. */
export function forwardFromYaw(yaw: number): { x: number; z: number } {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function rightFromYaw(yaw: number): { x: number; z: number } {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

export function yawFromDirection(x: number, z: number): number {
  return Math.atan2(-x, -z);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function wrapAngle(angle: number): number {
  const tau = Math.PI * 2;
  return angle - tau * Math.floor((angle + Math.PI) / tau);
}
