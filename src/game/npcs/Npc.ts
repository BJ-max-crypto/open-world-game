import { CapsuleGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

const COATS = ["#d6d0c6", "#6ea8a2", "#c46b62", "#8d7cc4", "#d0a15a", "#4d6f8a"];

export class Npc {
  readonly group: Group;
  x: number;
  z: number;
  private readonly route: { x: number; z: number }[];
  private index = 0;
  private readonly speed: number;
  private phase: number;
  facing = 0;

  constructor(route: { x: number; z: number }[], offset: number, speed: number, coat: string) {
    this.route = route;
    this.speed = speed;
    this.phase = offset * 10;
    const start = pointOnRoute(route, offset);
    this.x = start.x;
    this.z = start.z;
    this.index = start.index;
    this.group = buildNpc(coat);
    this.group.position.set(this.x, 0, this.z);
  }

  update(dt: number): void {
    const target = this.route[this.index];
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.4) {
      this.index = (this.index + 1) % this.route.length;
      return;
    }
    const step = Math.min(distance, this.speed * dt);
    this.x += (dx / distance) * step;
    this.z += (dz / distance) * step;
    this.facing = Math.atan2(-dx, -dz);
    this.phase += dt * this.speed * 3;
    this.group.position.set(this.x, Math.abs(Math.sin(this.phase)) * 0.05, this.z);
    this.group.rotation.y = this.facing;
  }
}

function pointOnRoute(route: { x: number; z: number }[], offset: number): { x: number; z: number; index: number } {
  const index = Math.min(route.length - 1, Math.floor(offset * route.length) % route.length);
  const next = (index + 1) % route.length;
  const from = route[index];
  const to = route[next];
  const t = (offset * route.length) % 1;
  return {
    x: from.x + (to.x - from.x) * t,
    z: from.z + (to.z - from.z) * t,
    index: next,
  };
}

function buildNpc(coat: string): Group {
  const group = new Group();
  const body = new Mesh(
    new CapsuleGeometry(0.22, 0.7, 4, 8),
    new MeshStandardMaterial({ color: coat, roughness: 0.75 }),
  );
  body.position.y = 0.85;
  body.castShadow = true;
  const head = new Mesh(
    new SphereGeometry(0.14, 12, 10),
    new MeshStandardMaterial({ color: "#e7c7ad", roughness: 0.6 }),
  );
  head.position.y = 1.48;
  head.castShadow = true;
  group.add(body, head);
  return group;
}

export function coatAt(index: number): string {
  return COATS[index % COATS.length];
}
