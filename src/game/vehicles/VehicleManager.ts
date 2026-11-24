import type { Scene } from "three";
import { GAME_CONFIG } from "@/game/engine/GameConfig";
import { rightFromYaw } from "@/game/engine/math";
import type { Controller } from "@/game/player/Controller";
import type { PhysicsWorld } from "@/game/physics/PhysicsWorld";
import type { AABB } from "@/game/physics/Collision";
import { Vehicle } from "@/game/vehicles/Vehicle";
import { VEHICLE_SPECS } from "@/game/vehicles/catalog";

export class VehicleManager {
  readonly vehicles: Vehicle[];
  active: Vehicle | null = null;

  constructor(scene: Scene) {
    this.vehicles = VEHICLE_SPECS.map((spec) => {
      const vehicle = new Vehicle(spec);
      scene.add(vehicle.group);
      return vehicle;
    });
  }

  nearestDriveable(x: number, z: number, radius = 3.4): Vehicle | null {
    let best: Vehicle | null = null;
    let bestDistance = radius;
    for (const vehicle of this.vehicles) {
      if (!vehicle.driveable || vehicle === this.active) continue;
      const distance = Math.hypot(vehicle.x - x, vehicle.z - z);
      if (distance < bestDistance) {
        best = vehicle;
        bestDistance = distance;
      }
    }
    return best;
  }

  enter(vehicle: Vehicle): void {
    this.active = vehicle;
    vehicle.speed = 0;
  }

  exitPoint(): { x: number; z: number } | null {
    if (!this.active) return null;
    const right = rightFromYaw(this.active.heading);
    return {
      x: this.active.x + right.x * 2.6,
      z: this.active.z + right.z * 2.6,
    };
  }

  leave(): void {
    if (this.active) this.active.speed = 0;
    this.active = null;
  }

  update(dt: number, controller: Controller, physics: PhysicsWorld): void {
    const active = this.active;
    if (!active) return;
    const throttle = controller.forward;
    const braking = controller.jump;
    active.update(dt, throttle, controller.strafe, braking, (x, z) => {
      const others = this.colliders(active);
      return physics.move(x, z, GAME_CONFIG.vehicle.radius, others);
    });
  }

  colliders(except?: Vehicle): AABB[] {
    return this.vehicles.filter((vehicle) => vehicle !== except).map((vehicle) => vehicle.collider());
  }

  exportPoses(): { id: string; x: number; z: number; heading: number; speed: number }[] {
    return this.vehicles.map((vehicle) => ({
      id: vehicle.spec.id,
      x: vehicle.x,
      z: vehicle.z,
      heading: vehicle.heading,
      speed: vehicle.speed,
    }));
  }

  applyPoses(poses: { id: string; x: number; z: number; heading: number; speed: number }[]): void {
    for (const pose of poses) {
      const vehicle = this.vehicles.find((entry) => entry.spec.id === pose.id);
      if (!vehicle) continue;
      if (!Number.isFinite(pose.x) || !Number.isFinite(pose.z)) continue;
      vehicle.x = pose.x;
      vehicle.z = pose.z;
      vehicle.heading = pose.heading;
      vehicle.speed = pose.speed;
      vehicle.sync();
    }
  }

  dispose(): void {
    for (const vehicle of this.vehicles) vehicle.dispose();
  }
}
