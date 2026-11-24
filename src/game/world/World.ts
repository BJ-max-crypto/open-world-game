import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Scene,
} from "three";
import { WORLD_HALF } from "@/game/engine/GameConfig";
import {
  buildings,
  lampPosts,
  pierDeck,
  trees,
  type Palette,
} from "@/game/world/District";
import { createCityMaterials, type CityMaterials } from "@/game/world/materials";

export class World {
  readonly materials: CityMaterials;
  private readonly geometries: BufferGeometry[] = [];
  private readonly water: Mesh;
  private readonly beacon: Mesh;

  constructor(scene: Scene) {
    this.materials = createCityMaterials();
    this.ground(scene);
    this.roads(scene);
    this.blocks(scene);
    this.dressing(scene);
    const deck = pierDeck();
    this.addBox(scene, deck.w, 0.35, deck.d, deck.x, 0.18, deck.z, this.materials.pier, true);

    this.water = this.plane(scene, 40, 120, 100, 0.08, -60, this.materials.water, false);
    this.beacon = this.addBox(scene, 0.45, 14, 0.45, 0, 7, 0, this.materials.marker, false);
    this.beacon.visible = false;
  }

  update(time: number, beacon: { x: number; z: number } | null): void {
    this.water.position.y = 0.08 + Math.sin(time * 0.8) * 0.03;
    this.beacon.visible = beacon !== null;
    if (beacon) {
      this.beacon.position.set(beacon.x, 7, beacon.z);
      const material = this.beacon.material;
      if (!Array.isArray(material) && "emissiveIntensity" in material) {
        material.emissiveIntensity = 0.45 + Math.sin(time * 3) * 0.35;
      }
    }
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.materials.dispose();
  }

  private ground(scene: Scene): void {
    const quadrants: Array<[Palette, number, number]> = [
      ["civic", -WORLD_HALF / 2, -WORLD_HALF / 2],
      ["pier", WORLD_HALF / 2, -WORLD_HALF / 2],
      ["house", -WORLD_HALF / 2, WORLD_HALF / 2],
      ["yard", WORLD_HALF / 2, WORLD_HALF / 2],
    ];
    for (const [palette, x, z] of quadrants) {
      this.plane(scene, WORLD_HALF, WORLD_HALF, x, 0, z, this.materials.ground[palette], true);
    }
  }

  private roads(scene: Scene): void {
    this.plane(scene, 240, 16, 0, 0.03, 0, this.materials.road, true);
    this.plane(scene, 16, 112, 0, 0.035, -64, this.materials.road, true);
    this.plane(scene, 16, 112, 0, 0.035, 64, this.materials.road, true);

    const walks: Array<[number, number, number, number]> = [
      [112, 6, -64, 11],
      [112, 6, 64, 11],
      [112, 6, -64, -11],
      [112, 6, 64, -11],
      [6, 106, -11, 67],
      [6, 106, -11, -67],
      [6, 106, 11, 67],
      [6, 106, 11, -67],
    ];
    for (const [w, d, x, z] of walks) {
      this.plane(scene, w, d, x, 0.025, z, this.materials.sidewalk, true);
    }

    for (let i = -14; i <= 14; i += 1) {
      if (Math.abs(i) <= 1) continue;
      this.addBox(scene, 2.4, 0.02, 0.18, i * 8, 0.05, 0, this.materials.trim, false);
      this.addBox(scene, 0.18, 0.02, 2.4, 0, 0.055, i * 8, this.materials.trim, false);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i += 1) {
        this.addBox(scene, 0.35, 0.02, 1.6, side * (9.2 + i * 0.7), 0.06, 0, this.materials.trim, false);
        this.addBox(scene, 1.6, 0.02, 0.35, 0, 0.06, side * (9.2 + i * 0.7), this.materials.trim, false);
      }
    }
  }

  private blocks(scene: Scene): void {
    for (const building of buildings()) {
      const mesh = this.addBox(
        scene,
        building.w,
        building.h,
        building.d,
        building.x,
        building.h / 2,
        building.z,
        this.materials.facade[building.palette],
        true,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.addBox(
        scene,
        building.w + 0.4,
        0.35,
        building.d + 0.4,
        building.x,
        building.h + 0.15,
        building.z,
        this.materials.trim,
        true,
      );
      if (building.id === "loft-tower" || building.id === "yard-0") {
        this.addBox(
          scene,
          1.5,
          2.5,
          0.18,
          building.x,
          1.25,
          building.z + building.d / 2 + 0.08,
          this.materials.trim,
          true,
        );
      }
    }
  }

  private dressing(scene: Scene): void {
    const lamp = buildLamp(this.materials);
    lamp.traverse((obj) => {
      if (obj instanceof Mesh) this.geometries.push(obj.geometry);
    });
    for (const post of lampPosts()) {
      const clone = lamp.clone(true);
      clone.position.set(post.x, 0, post.z);
      scene.add(clone);
    }
    for (const tree of trees()) {
      this.addCylinder(scene, 0.18, 0.28, 1.3, tree.x, 0.65, tree.z, this.materials.trunk);
      const canopy = new Mesh(new SphereGeometry(1.15, 12, 10), this.materials.canopy);
      this.geometries.push(canopy.geometry);
      canopy.position.set(tree.x, 2.1, tree.z);
      canopy.castShadow = true;
      scene.add(canopy);
    }
    this.addBox(scene, 1.4, 1.1, 1.4, 40.2, 0.55, -18.2, this.materials.pier, true);
    this.addBox(scene, 1.1, 0.8, 1.1, 42.1, 0.4, -17.6, this.materials.trim, true);
  }

  private plane(
    scene: Scene,
    width: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: CityMaterials["road"],
    shadows: boolean,
  ): Mesh {
    const geometry = new PlaneGeometry(width, depth);
    geometry.rotateX(-Math.PI / 2);
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = shadows;
    scene.add(mesh);
    return mesh;
  }

  private addBox(
    scene: Scene,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: CityMaterials["road"],
    shadows: boolean,
  ): Mesh {
    const geometry = new BoxGeometry(width, height, depth);
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    scene.add(mesh);
    return mesh;
  }

  private addCylinder(
    scene: Scene,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    x: number,
    y: number,
    z: number,
    material: CityMaterials["trunk"],
  ): void {
    const geometry = new CylinderGeometry(radiusTop, radiusBottom, height, 8);
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
  }
}

function buildLamp(materials: CityMaterials): Group {
  const group = new Group();
  const pole = new Mesh(new CylinderGeometry(0.08, 0.1, 4.2, 8), materials.lamp);
  pole.position.y = 2.1;
  pole.castShadow = true;
  const arm = new Mesh(new BoxGeometry(0.7, 0.08, 0.08), materials.lamp);
  arm.position.set(0.3, 4.15, 0);
  const bulb = new Mesh(new SphereGeometry(0.16, 10, 8), materials.bulb);
  bulb.position.set(0.62, 4.02, 0);
  group.add(pole, arm, bulb);
  return group;
}
