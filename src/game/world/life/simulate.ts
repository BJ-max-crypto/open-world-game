import { SOLIDS } from "@/game/world/coast/layout";
import {
  BOAT_PATHS,
  LANES,
  WALKS,
  laneLength,
  lanePose,
  signalPhase,
  waveHeight,
  type PathPoint,
} from "@/game/world/life/routes";

export type PedMode = "walk" | "wait" | "talk" | "approach" | "inside";

export interface Pedestrian {
  id: number;
  person: number;
  loop: number;
  to: number;
  x: number;
  z: number;
  yaw: number;
  pace: number;
  mode: PedMode;
  timer: number;
  cooldown: number;
  bench: boolean;
}

export type VehicleKind = "sedan" | "suv" | "van" | "truck";

export interface TrafficCar {
  id: number;
  lane: number;
  distance: number;
  speed: number;
  braking: boolean;
  kind: VehicleKind;
  color: string;
  driver: number;
}

export interface Watercraft {
  id: number;
  path: number;
  distance: number;
  speed: number;
  x: number;
  z: number;
  y: number;
  yaw: number;
  kind: "skiff" | "sail" | "ferry";
}

export interface CityLifeState {
  time: number;
  peds: Pedestrian[];
  cars: TrafficCar[];
  boats: Watercraft[];
}

const BUILDINGS = SOLIDS.filter((solid) => solid.kind === "building");

export function blockedByBuilding(x: number, z: number, padding = 0.35): boolean {
  return BUILDINGS.some(
    (building) =>
      Math.abs(building.x - x) <= building.w / 2 + padding && Math.abs(building.z - z) <= building.d / 2 + padding,
  );
}

function point(loop: number, index: number): PathPoint {
  const points = WALKS[loop].points;
  return points[((index % points.length) + points.length) % points.length];
}

export function createLife(): CityLifeState {
  const peds: Pedestrian[] = [];
  let id = 0;
  WALKS.forEach((loop, loopIndex) => {
    const count = loopIndex === 0 ? 4 : 2;
    for (let i = 0; i < count; i += 1) {
      const to = Math.floor((i / count) * loop.points.length);
      const at = point(loopIndex, to);
      peds.push({
        id,
        person: id % 8,
        loop: loopIndex,
        to,
        x: at.x,
        z: at.z,
        yaw: 0,
        pace: 1.15 + ((id * 0.17) % 0.7),
        mode: "walk",
        timer: 0,
        cooldown: i === 0 ? 0 : 4,
        bench: loopIndex === 0 && i === 2,
      });
      id += 1;
    }
  });

  const kinds: VehicleKind[] = ["sedan", "suv", "van", "truck", "sedan", "suv"];
  const colors = ["#d7d2c8", "#8c3f38", "#1e242b", "#3e4c59", "#c6b7a2", "#2f3d4a"];
  const cars: TrafficCar[] = LANES.map((_, lane) => {
    const length = laneLength(LANES[lane]);
    return {
      id: lane,
      lane,
      distance: length * (0.15 + (lane % 3) * 0.22),
      speed: 6,
      braking: false,
      kind: kinds[lane % kinds.length],
      color: colors[lane % colors.length],
      driver: lane % 8,
    };
  });

  const boats: Watercraft[] = BOAT_PATHS.map((path, index) => {
    const pose = boatPose(index, Math.abs(path.to - path.from) * 0.35);
    return {
      id: index,
      path: index,
      distance: Math.abs(path.to - path.from) * 0.35,
      speed: 2.2 + index * 0.6,
      ...pose,
      kind: index === 0 ? "skiff" : index === 1 ? "sail" : "ferry",
    };
  });

  return { time: 0, peds, cars, boats };
}

function moveToward(ped: Pedestrian, target: PathPoint, dt: number, speed: number): number {
  const dx = target.x - ped.x;
  const dz = target.z - ped.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-4) return 0;
  const step = Math.min(dist, speed * dt);
  const nx = ped.x + (dx / dist) * step;
  const nz = ped.z + (dz / dist) * step;
  if (!blockedByBuilding(nx, nz, 0.2)) {
    ped.x = nx;
    ped.z = nz;
  }
  ped.yaw = Math.atan2(dx, dz);
  return dist - step;
}

export function stepLife(state: CityLifeState, dt: number): void {
  const step = Math.min(Math.max(dt, 0), 0.05);
  state.time += step;
  const phase = signalPhase(state.time);
  stepPeds(state, step, phase);
  separatePeds(state.peds);
  stepCars(state, step, phase);
  stepBoats(state, step);
}

function stepPeds(state: CityLifeState, dt: number, phase: "coast" | "cross"): void {
  for (const ped of state.peds) {
    ped.cooldown = Math.max(0, ped.cooldown - dt);
    if (ped.mode === "inside" || ped.mode === "talk") {
      ped.timer -= dt;
      if (ped.timer <= 0) ped.mode = "walk";
      continue;
    }
    const target = point(ped.loop, ped.to);
    if (ped.mode === "approach") {
      if (!target.door) {
        ped.mode = "walk";
      } else {
        const left = moveToward(ped, target.door, dt, ped.pace);
        if (left < 0.35) {
          ped.mode = "inside";
          ped.timer = 6;
          ped.cooldown = 18;
          ped.to = (ped.to + 1) % WALKS[ped.loop].points.length;
        }
      }
      continue;
    }
    const waiting = target.hold === "coast" ? phase === "coast" : target.hold === "inland" ? phase === "coast" : false;
    const close = Math.hypot(target.x - ped.x, target.z - ped.z) < 0.45;
    if (waiting && close) {
      ped.mode = "wait";
      continue;
    }
    ped.mode = "walk";
    const left = moveToward(ped, target, dt, ped.bench && close ? 0.4 : ped.pace);
    if (left > 0.2) continue;
    if (target.talk && ped.id % 2 === 0) {
      ped.mode = "talk";
      ped.timer = 3.2;
      ped.to = (ped.to + 1) % WALKS[ped.loop].points.length;
      continue;
    }
    if (target.door && ped.cooldown <= 0 && ped.id % 3 === 0) {
      ped.mode = "approach";
      continue;
    }
    ped.to = (ped.to + 1) % WALKS[ped.loop].points.length;
  }
}

function separatePeds(peds: Pedestrian[]): void {
  for (let i = 0; i < peds.length; i += 1) {
    for (let j = i + 1; j < peds.length; j += 1) {
      const a = peds[i];
      const b = peds[j];
      if (a.mode === "inside" || b.mode === "inside") continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.75 || dist < 1e-4) continue;
      const push = (0.75 - dist) * 0.5;
      const ox = (dx / dist) * push;
      const oz = (dz / dist) * push;
      if (!blockedByBuilding(a.x - ox, a.z - oz, 0.2)) {
        a.x -= ox;
        a.z -= oz;
      }
      if (!blockedByBuilding(b.x + ox, b.z + oz, 0.2)) {
        b.x += ox;
        b.z += oz;
      }
    }
  }
}

function redLight(car: TrafficCar, phase: "coast" | "cross"): boolean {
  const lane = LANES[car.lane];
  const pose = lanePose(lane, car.distance);
  const dir = lane.to >= lane.from ? 1 : -1;
  if (lane.road === "cross") {
    if (phase === "cross") return false;
    for (const stop of [-12.5, 15.5]) {
      const toward = (stop - pose.z) * dir > 0;
      const dist = Math.abs(stop - pose.z);
      if (toward && dist < 8 && dist > 3) return true;
    }
    return false;
  }
  if (phase === "coast") return false;
  const toward = -pose.x * dir > 0;
  const dist = Math.abs(pose.x);
  return toward && dist < 8 && dist > 3.5;
}

function stepCars(state: CityLifeState, dt: number, phase: "coast" | "cross"): void {
  for (const car of state.cars) {
    const lane = LANES[car.lane];
    const length = laneLength(lane);
    let desired = car.kind === "truck" ? 5.2 : 7.4;
    for (const other of state.cars) {
      if (other.id === car.id || other.lane !== car.lane) continue;
      let gap = other.distance - car.distance;
      if (gap < 0) gap += length;
      if (gap < 8) desired = Math.min(desired, other.speed * (gap / 8));
    }
    const braking = redLight(car, phase);
    if (braking) desired = 0;
    const rate = desired < car.speed ? 10 : 4;
    const delta = desired - car.speed;
    car.speed += Math.sign(delta) * Math.min(Math.abs(delta), rate * dt);
    car.braking = braking || car.speed < 1;
    car.distance = (car.distance + Math.max(0, car.speed) * dt) % length;
  }
}

function boatPose(pathIndex: number, distance: number): { x: number; z: number; y: number; yaw: number } {
  const path = BOAT_PATHS[pathIndex];
  const length = Math.abs(path.to - path.from);
  const wrapped = ((distance % length) + length) % length;
  const t = wrapped / length;
  const dir = path.to >= path.from ? 1 : -1;
  const x = path.from + (path.to - path.from) * t;
  return { x, z: path.z, y: waveHeight(x, path.z, 0), yaw: dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
}

function stepBoats(state: CityLifeState, dt: number): void {
  for (const boat of state.boats) {
    const path = BOAT_PATHS[boat.path];
    const length = Math.abs(path.to - path.from);
    boat.distance = (boat.distance + boat.speed * dt) % length;
    const pose = boatPose(boat.path, boat.distance);
    boat.x = pose.x;
    boat.z = pose.z;
    boat.y = waveHeight(pose.x, pose.z, state.time);
    boat.yaw = pose.yaw;
  }
}
