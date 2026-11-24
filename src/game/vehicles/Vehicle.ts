import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { GAME_CONFIG } from "@/game/engine/GameConfig";
import { forwardFromYaw, rightFromYaw } from "@/game/engine/math";
import type { AABB } from "@/game/physics/Collision";
import { VEHICLE_SPECS, type VehicleSpec } from "@/game/vehicles/catalog";

export type { VehicleSpec };
export { VEHICLE_SPECS };

export class Vehicle {
  readonly group: Group;
  readonly spec: VehicleSpec;
  x: number;
  z: number;
  heading: number;
  speed = 0;
  private spin = 0;
  private readonly wheels: Mesh[] = [];
  private readonly brake: Mesh;

  constructor(spec: VehicleSpec) {
    this.spec = spec;
    this.x = spec.x;
    this.z = spec.z;
    this.heading = spec.heading;
    const bodyMat = new MeshStandardMaterial({ color: spec.color, roughness: 0.45, metalness: 0.15 });
    const dark = new MeshStandardMaterial({ color: "#1c2128", roughness: 0.6, metalness: 0.2 });
    const glass = new MeshStandardMaterial({ color: "#9fd0d8", roughness: 0.15, metalness: 0.1 });
    const light = new MeshStandardMaterial({ color: "#fff4d2", emissive: "#fff1c4", emissiveIntensity: 0.8 });
    const brakeMat = new MeshStandardMaterial({ color: "#ff5a3c", emissive: "#ff2a1a", emissiveIntensity: 0.2 });

    this.group = new Group();
    const chassis = new Mesh(new BoxGeometry(1.85, 0.55, 4.3), bodyMat);
    chassis.position.y = 0.62;
    chassis.castShadow = true;
    const cabin = new Mesh(new BoxGeometry(1.7, 0.55, 2.1), spec.driveable ? bodyMat : dark);
    cabin.position.set(0, 1.12, -0.15);
    cabin.castShadow = true;
    const window = new Mesh(new BoxGeometry(1.55, 0.38, 1.7), glass);
    window.position.set(0, 1.16, -0.15);
    this.brake = new Mesh(new BoxGeometry(1.5, 0.12, 0.08), brakeMat);
    this.brake.position.set(0, 0.7, 2.16);

    const headL = new Mesh(new BoxGeometry(0.28, 0.16, 0.08), light);
    const headR = headL.clone();
    headL.position.set(-0.55, 0.68, -2.16);
    headR.position.set(0.55, 0.68, -2.16);

    this.group.add(chassis, cabin, window, this.brake, headL, headR);
    for (const [x, z] of [
      [-0.85, -1.35],
      [0.85, -1.35],
      [-0.85, 1.35],
      [0.85, 1.35],
    ] as const) {
      const wheel = new Mesh(new CylinderGeometry(0.36, 0.36, 0.28, 12), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      wheel.castShadow = true;
      this.wheels.push(wheel);
      this.group.add(wheel);
    }
    this.sync();
  }

  get driveable(): boolean {
    return this.spec.driveable;
  }

  update(dt: number, throttle: number, steer: number, braking: boolean, blocked: (x: number, z: number) => { x: number; z: number }): void {
    const config = GAME_CONFIG.vehicle;
    if (throttle > 0) this.speed += config.accel * throttle * dt;
    else if (throttle < 0 && this.speed > 0.4) this.speed -= config.brake * dt;
    else if (throttle < 0) this.speed -= config.reverseAccel * dt;
    else this.speed *= Math.exp(-1.3 * dt);

    if (braking && this.speed > 0) this.speed -= config.brake * dt;
    this.speed = Math.max(-config.maxReverse, Math.min(config.maxSpeed, this.speed));
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;

    const influence = clamp01(Math.abs(this.speed) / 6);
    this.heading -= steer * config.steer * influence * dt * Math.sign(this.speed || 1);

    const forward = forwardFromYaw(this.heading);
    const next = blocked(this.x + forward.x * this.speed * dt, this.z + forward.z * this.speed * dt);
    if (Math.hypot(next.x - this.x, next.z - this.z) < Math.abs(this.speed) * dt * 0.45) {
      this.speed *= 0.2;
    }
    this.x = next.x;
    this.z = next.z;

    this.spin += this.speed * dt * 1.6;
    for (const wheel of this.wheels) wheel.rotation.x = this.spin;
    const brakeMat = this.brake.material;
    if (brakeMat instanceof MeshStandardMaterial) {
      brakeMat.emissiveIntensity = braking || throttle < 0 ? 1.3 : 0.15;
    }
    this.sync();
  }

  collider(): AABB {
    const forward = forwardFromYaw(this.heading);
    const right = rightFromYaw(this.heading);
    const halfL = 2.35;
    const halfW = 1.05;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const lx of [-halfW, halfW]) {
      for (const lz of [-halfL, halfL]) {
        const x = this.x + right.x * lx + forward.x * lz;
        const z = this.z + right.z * lx + forward.z * lz;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
    return { id: this.spec.id, minX, maxX, minZ, maxZ };
  }

  sync(): void {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.geometry.dispose();
        const material = obj.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
    });
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
