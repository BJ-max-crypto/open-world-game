/** Tunables for the Rapier third-person prototype. */
export const FOUNDATION = {
  walkSpeed: 1.65,
  sprintSpeed: 4.6,
  /** Meters per second squared while a direction is held. */
  acceleration: 6,
  /** Meters per second squared after the direction is released. */
  deceleration: 10,
  jumpVelocity: 5.2,
  gravity: -22,
  /** Capsule matches the 1.83 m humanoid: total height is 2 * (half + radius). */
  capsuleHalf: 0.635,
  capsuleRadius: 0.28,
  eye: 0.55,
  spawn: [-6, 0.96, -19.6] as const,
  cameraDistance: 6.2,
  cameraMinDistance: 0.9,
  cameraPadding: 0.28,
  cameraSharpness: 12,
  turnSharpness: 14,
  lookSensitivity: 0.0022,
  pitchMin: -0.42,
  pitchMax: 1.05,
  initialYaw: Math.PI,
  initialPitch: 0.28,
  skin: 0.06,
  autostepHeight: 0.35,
  autostepMinWidth: 0.18,
  snapDistance: 0.28,
  maxSlope: Math.PI / 4,
  minSlide: (Math.PI * 50) / 180,
} as const;
