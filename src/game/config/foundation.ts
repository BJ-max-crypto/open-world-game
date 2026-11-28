/** Tunables for the Rapier third-person prototype. */
export const FOUNDATION = {
  walkSpeed: 2.02,
  sprintSpeed: 5.64,
  /** Meters per second squared while a direction is held. Scaled with the speeds so the ramp stays the same length. */
  acceleration: 7.35,
  /** Meters per second squared after the direction is released. */
  deceleration: 12.25,
  jumpVelocity: 5.2,
  /** Temporary. Meters per second while Space is held. Remove with the lift gesture. */
  liftSpeed: 12,
  gravity: -22,
  /** Capsule matches the 1.83 m humanoid: total height is 2 * (half + radius). */
  capsuleHalf: 0.635,
  capsuleRadius: 0.28,
  eye: 0.55,
  /** On the south plaza, facing the entrance. The shaft is above this view until the camera looks up. */
  spawn: [0, 0.96, -34] as const,
  cameraDistance: 7.4,
  cameraMinDistance: 0.9,
  cameraPadding: 0.28,
  cameraSharpness: 12,
  turnSharpness: 14,
  lookSensitivity: 0.0022,
  pitchMin: -0.42,
  pitchMax: 1.05,
  initialYaw: Math.PI,
  initialPitch: 0.3,
  skin: 0.06,
  autostepHeight: 0.35,
  autostepMinWidth: 0.18,
  snapDistance: 0.28,
  maxSlope: Math.PI / 4,
  minSlide: (Math.PI * 50) / 180,
} as const;
