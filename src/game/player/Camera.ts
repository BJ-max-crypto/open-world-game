import { PerspectiveCamera } from "three";
import { GAME_CONFIG, type Settings } from "@/game/engine/GameConfig";
import { clamp, damp, forwardFromYaw } from "@/game/engine/math";
import { pointBlocked, type AABB } from "@/game/physics/Collision";

export class CameraRig {
  readonly camera: PerspectiveCamera;
  yaw = 0;
  pitch = 0.42;
  private distance: number = GAME_CONFIG.camera.distance;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(58, aspect, 0.1, 500);
    this.camera.position.set(0, 4, 8);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  applyLook(dx: number, dy: number, settings: Settings): void {
    this.yaw -= dx * settings.mouseSensitivity;
    const invert = settings.invertY ? -1 : 1;
    this.pitch = clamp(
      this.pitch + dy * settings.mouseSensitivity * invert,
      GAME_CONFIG.camera.minPitch,
      GAME_CONFIG.camera.maxPitch,
    );
  }

  update(dt: number, targetX: number, targetY: number, targetZ: number, boxes: AABB[]): void {
    const lookY = targetY + GAME_CONFIG.camera.lookHeight;
    let distance = GAME_CONFIG.camera.distance;
    for (let step = 0; step < 6; step += 1) {
      const horizontal = Math.cos(this.pitch) * distance;
      const ahead = forwardFromYaw(this.yaw);
      const x = targetX - ahead.x * horizontal;
      const z = targetZ - ahead.z * horizontal;
      if (!pointBlocked(x, z, 0.35, boxes)) break;
      distance *= 0.72;
    }
    this.distance = damp(this.distance, Math.max(1.15, distance), 10, dt);

    const forward = forwardFromYaw(this.yaw);
    const horizontal = Math.cos(this.pitch) * this.distance;
    const x = targetX - forward.x * horizontal;
    const z = targetZ - forward.z * horizontal;
    const y = lookY + Math.sin(this.pitch) * this.distance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(targetX, lookY, targetZ);
  }
}
