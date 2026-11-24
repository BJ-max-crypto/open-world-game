import type { Scene } from "three";
import { coatAt, Npc } from "@/game/npcs/Npc";
import { sidewalkRoutes } from "@/game/world/District";

export class NpcManager {
  readonly npcs: Npc[] = [];

  constructor(scene: Scene) {
    const routes = sidewalkRoutes();
    routes.forEach((route, routeIndex) => {
      for (let i = 0; i < 3; i += 1) {
        const npc = new Npc(route, (i + 0.15) / 3, 1.15 + ((routeIndex + i) % 3) * 0.18, coatAt(routeIndex * 3 + i));
        scene.add(npc.group);
        this.npcs.push(npc);
      }
    });
  }

  update(dt: number): void {
    for (const npc of this.npcs) npc.update(dt);
  }
}
