import {
  BoxGeometry,
  CapsuleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
} from "three";
import { GAME_CONFIG } from "@/game/engine/GameConfig";
import { forwardFromYaw, rightFromYaw, yawFromDirection } from "@/game/engine/math";
import type { Controller } from "@/game/player/Controller";
import { stepVertical, type PhysicsWorld } from "@/game/physics/PhysicsWorld";
import type { AABB } from "@/game/physics/Collision";

export class Player {
  readonly group: Group;
  x: number;
  y = 0;
  z: number;
  vy = 0;
  facing: number;
  grounded = true;
  stamina = 1;
  private walk = 0;
  private readonly leftLeg: Object3D;
  private readonly rightLeg: Object3D;
  private readonly leftArm: Object3D;
  private readonly rightArm: Object3D;

  constructor(x: number, z: number, facing: number) {
    this.x = x;
    this.z = z;
    this.facing = facing;
    const built = buildFigure();
    this.group = built.group;
    this.leftLeg = built.leftLeg;
    this.rightLeg = built.rightLeg;
    this.leftArm = built.leftArm;
    this.rightArm = built.rightArm;
    this.syncMesh();
  }

  update(dt: number, controller: Controller, cameraYaw: number, physics: PhysicsWorld, extra: AABB[]): number {
    const wishX = controller.strafe;
    const wishZ = controller.forward;
    const length = Math.hypot(wishX, wishZ);
    const moving = length > 0.01;
    const sprinting = moving && controller.sprint && this.stamina > 0.05 && this.grounded;
    if (sprinting) this.stamina = Math.max(0, this.stamina - dt * 0.18);
    else this.stamina = Math.min(1, this.stamina + dt * 0.22);

    const speed = sprinting ? GAME_CONFIG.player.sprint : GAME_CONFIG.player.walk;
    const forward = forwardFromYaw(cameraYaw);
    const right = rightFromYaw(cameraYaw);
    let mx = 0;
    let mz = 0;
    if (moving) {
      const scale = speed / length;
      mx = (forward.x * wishZ + right.x * wishX) * scale;
      mz = (forward.z * wishZ + right.z * wishX) * scale;
      this.facing = yawFromDirection(mx, mz);
    }

    if (controller.consumePress("Space") && this.grounded) {
      this.vy = GAME_CONFIG.player.jump;
      this.grounded = false;
    }

    const vertical = stepVertical(
      { y: this.y, vy: this.vy, grounded: this.grounded },
      dt,
      GAME_CONFIG.physics.gravity,
    );
    this.y = vertical.y;
    this.vy = vertical.vy;
    this.grounded = vertical.grounded;

    const next = physics.move(
      this.x + mx * dt,
      this.z + mz * dt,
      GAME_CONFIG.player.radius,
      extra,
    );
    this.x = next.x;
    this.z = next.z;
    this.animate(dt, moving ? speed : 0);
    this.syncMesh();
    return moving ? speed : 0;
  }

  private animate(dt: number, speed: number): void {
    if (speed < 0.2) {
      this.walk = 0;
    } else {
      this.walk += dt * speed * 2.1;
    }
    const swing = Math.sin(this.walk) * Math.min(0.7, speed * 0.08);
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.7;
    this.rightArm.rotation.x = swing * 0.7;
  }

  syncMesh(): void {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.facing;
    this.group.visible = true;
  }
}

function buildFigure(): {
  group: Group;
  leftLeg: Object3D;
  rightLeg: Object3D;
  leftArm: Object3D;
  rightArm: Object3D;
} {
  const group = new Group();
  const coat = new MeshStandardMaterial({ color: "#e07a45", roughness: 0.7 });
  const cloth = new MeshStandardMaterial({ color: "#2c3340", roughness: 0.8 });
  const skin = new MeshStandardMaterial({ color: "#e6c2a6", roughness: 0.65 });
  const hair = new MeshStandardMaterial({ color: "#1b1e24", roughness: 0.5 });

  const torso = new Mesh(new BoxGeometry(0.46, 0.62, 0.26), coat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);

  const head = new Mesh(new SphereGeometry(0.16, 16, 12), skin);
  head.position.y = 1.58;
  head.castShadow = true;
  group.add(head);

  const cap = new Mesh(new SphereGeometry(0.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair);
  cap.position.y = 1.6;
  cap.castShadow = true;
  group.add(cap);

  const leftLeg = limb(cloth, -0.12);
  const rightLeg = limb(cloth, 0.12);
  const leftArm = arm(coat, -0.32);
  const rightArm = arm(coat, 0.32);
  group.add(leftLeg, rightLeg, leftArm, rightArm);
  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

function limb(material: MeshStandardMaterial, x: number): Group {
  const pivot = new Group();
  pivot.position.set(x, 0.82, 0);
  const mesh = new Mesh(new CapsuleGeometry(0.07, 0.42, 4, 8), material);
  mesh.position.y = -0.32;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

function arm(material: MeshStandardMaterial, x: number): Group {
  const pivot = new Group();
  pivot.position.set(x, 1.32, 0);
  const mesh = new Mesh(new CapsuleGeometry(0.06, 0.36, 4, 8), material);
  mesh.position.y = -0.26;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}
