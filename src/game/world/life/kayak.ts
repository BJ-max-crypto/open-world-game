import { FOUNDATION } from "@/game/config/foundation";
import { waveHeight } from "@/game/world/life/routes";

/** Mesh bounds of kayak.glb, multiplied by the scene scale. Long axis is local +Z. */
export const KAYAK_SCALE = 2.15;
export const KAYAK_HALF_LENGTH = 1.003 * KAYAK_SCALE;
export const KAYAK_HALF_BEAM = 0.139 * KAYAK_SCALE;

/** Zero keeps the hull midline on the wave, so the cockpit stays above the surface. */
const DRAFT = 0;

/** No hull sample may cross onto the land side of the seawall. */
export const SHORE_LIMIT_Z = -24.7;

export const KAYAK_DOCK = { x: -18, z: -24.2, w: 2.7, d: 6.4 };
/** Far enough east that the stern clears the dock when the bow points +X. */
export const KAYAK_MOORING = { x: -13.9, z: -26.15, yaw: Math.PI / 2 };

const HARBOR_X = 46;
const HARBOR_Z_FAR = -62;
const BOARD_RADIUS = 3.3;
const EXIT_REACH = 3.5;

export interface KayakState {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  occupied: boolean;
}

export interface KayakInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

export interface BoatSample {
  x: number;
  z: number;
  radius: number;
}

export interface KayakSeat {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
}

export function createKayak(): KayakState {
  return {
    x: KAYAK_MOORING.x,
    z: KAYAK_MOORING.z,
    yaw: KAYAK_MOORING.yaw,
    speed: 0,
    occupied: false,
  };
}

export function kayakSurface(x: number, z: number, time: number): number {
  return waveHeight(x, z, time) - DRAFT;
}

/** Capsule center so the avatar's feet rest in the cockpit. */
export function kayakSeat(state: KayakState, time: number): KayakSeat {
  const feet = kayakSurface(state.x, state.z, time) + 0.12;
  return {
    x: state.x,
    y: feet + FOUNDATION.capsuleHalf + FOUNDATION.capsuleRadius,
    z: state.z,
    yaw: state.yaw,
    speed: Math.abs(state.speed),
  };
}

/** Standing spot on the landward end of the dock. */
export function dockStand(): { x: number; y: number; z: number } {
  const deck = 0.24;
  return {
    x: KAYAK_DOCK.x,
    y: deck + FOUNDATION.capsuleHalf + FOUNDATION.capsuleRadius,
    z: KAYAK_DOCK.z + KAYAK_DOCK.d / 2 - 0.7,
  };
}

export function canBoard(playerX: number, playerZ: number, kayak: KayakState): boolean {
  if (kayak.occupied) return false;
  return Math.hypot(playerX - kayak.x, playerZ - kayak.z) <= BOARD_RADIUS;
}

export function canStepOff(kayak: KayakState): boolean {
  if (!kayak.occupied) return false;
  const halfW = KAYAK_DOCK.w / 2;
  const halfD = KAYAK_DOCK.d / 2;
  const closestX = Math.max(KAYAK_DOCK.x - halfW, Math.min(kayak.x, KAYAK_DOCK.x + halfW));
  const closestZ = Math.max(KAYAK_DOCK.z - halfD, Math.min(kayak.z, KAYAK_DOCK.z + halfD));
  return Math.hypot(kayak.x - closestX, kayak.z - closestZ) <= EXIT_REACH;
}

export function hullClear(x: number, z: number, yaw: number, boats: readonly BoatSample[]): boolean {
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const samples: Array<[number, number]> = [
    [0, 0],
    [KAYAK_HALF_LENGTH, 0],
    [-KAYAK_HALF_LENGTH, 0],
    [0, KAYAK_HALF_BEAM],
    [0, -KAYAK_HALF_BEAM],
  ];
  for (const [along, aside] of samples) {
    const px = x + forwardX * along + rightX * aside;
    const pz = z + forwardZ * along + rightZ * aside;
    if (pz > SHORE_LIMIT_Z) return false;
    if (pz < HARBOR_Z_FAR) return false;
    if (Math.abs(px) > HARBOR_X) return false;
    if (hitsDock(px, pz)) return false;
  }
  for (const boat of boats) {
    if (Math.hypot(boat.x - x, boat.z - z) < boat.radius) return false;
  }
  return true;
}

function hitsDock(x: number, z: number): boolean {
  const pad = 0.28;
  return (
    Math.abs(x - KAYAK_DOCK.x) <= KAYAK_DOCK.w / 2 + pad &&
    Math.abs(z - KAYAK_DOCK.z) <= KAYAK_DOCK.d / 2 + pad
  );
}

/** Slide the hull out of the shore, the dock, and other boats. Turning always applies. */
function relax(x: number, z: number, yaw: number, boats: readonly BoatSample[]): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 5; pass += 1) {
    let dx = 0;
    let dz = 0;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const offsets: Array<[number, number]> = [
      [0, 0],
      [KAYAK_HALF_LENGTH, 0],
      [-KAYAK_HALF_LENGTH, 0],
      [0, KAYAK_HALF_BEAM],
      [0, -KAYAK_HALF_BEAM],
    ];
    for (const [along, aside] of offsets) {
      const sx = px + forwardX * along + rightX * aside;
      const sz = pz + forwardZ * along + rightZ * aside;
      if (sz > SHORE_LIMIT_Z) dz += SHORE_LIMIT_Z - sz;
      if (sz < HARBOR_Z_FAR) dz += HARBOR_Z_FAR - sz;
      if (sx > HARBOR_X) dx += HARBOR_X - sx;
      if (sx < -HARBOR_X) dx += -HARBOR_X - sx;
      if (hitsDock(sx, sz)) {
        const ox = sx - KAYAK_DOCK.x;
        const oz = sz - KAYAK_DOCK.z;
        if (Math.abs(ox) > Math.abs(oz)) dx += Math.sign(ox || 1) * 0.35;
        else dz += Math.sign(oz || -1) * 0.35;
      }
    }
    for (const boat of boats) {
      const ox = px - boat.x;
      const oz = pz - boat.z;
      const dist = Math.hypot(ox, oz) || 0.001;
      if (dist >= boat.radius) continue;
      const push = boat.radius - dist + 0.15;
      dx += (ox / dist) * push;
      dz += (oz / dist) * push;
    }
    px += dx;
    pz += dz;
    if (Math.abs(dx) + Math.abs(dz) < 0.02) break;
  }
  return { x: px, z: pz };
}

export function stepKayak(
  state: KayakState,
  input: KayakInput,
  dt: number,
  boats: readonly BoatSample[],
): KayakState {
  if (!state.occupied) return { ...state, speed: 0 };
  const target = input.forward ? (input.sprint ? 3.4 : 2.15) : input.back ? -0.9 : 0;
  const rate = target === 0 || Math.sign(target) !== Math.sign(state.speed) ? 2.4 : 1.5;
  const delta = target - state.speed;
  const speed = state.speed + Math.sign(delta) * Math.min(Math.abs(delta), rate * dt);
  const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const turnRate = 0.7 + Math.min(Math.abs(speed), 2.2) * 0.35;
  const yaw = state.yaw + turn * turnRate * dt;
  const moved = relax(
    state.x + Math.sin(yaw) * speed * dt,
    state.z + Math.cos(yaw) * speed * dt,
    yaw,
    boats,
  );
  return { ...state, x: moved.x, z: moved.z, yaw, speed };
}
