import {
  ACESFilmicToneMapping,
  Mesh,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Object3D,
} from "three";
import { AudioManager } from "@/game/audio/AudioManager";
import { Economy, type LedgerEntry } from "@/game/economy/Economy";
import { GAME_CONFIG, START_CASH, type Settings } from "@/game/engine/GameConfig";
import { GameLoop } from "@/game/engine/GameLoop";
import { wrapAngle } from "@/game/engine/math";
import type { GameSnapshot, Panel, SaveGame } from "@/game/engine/types";
import { collectPrompts, type PromptSource } from "@/game/interaction/InteractionSystem";
import { Inventory, starterItems } from "@/game/inventory/Inventory";
import { FIRST_FARE } from "@/game/missions/Mission";
import { MissionManager } from "@/game/missions/MissionManager";
import { NpcManager } from "@/game/npcs/NpcManager";
import { CameraRig } from "@/game/player/Camera";
import { Controller } from "@/game/player/Controller";
import { Player } from "@/game/player/Player";
import { PhysicsWorld } from "@/game/physics/PhysicsWorld";
import { PropertyManager } from "@/game/properties/PropertyManager";
import { VehicleManager } from "@/game/vehicles/VehicleManager";
import { districtAt, SPAWN, staticColliders } from "@/game/world/District";
import { Environment } from "@/game/world/Environment";
import { World } from "@/game/world/World";

export interface GameOptions {
  container: HTMLElement;
  settings: Settings;
  save: SaveGame | null;
  callsign: string;
  onSnapshot: (snapshot: GameSnapshot) => void;
  onLedger: (entry: LedgerEntry) => void;
  onPersist: (save: SaveGame) => void;
}

export class Game {
  private readonly options: GameOptions;
  private readonly scene = new Scene();
  private readonly renderer: WebGLRenderer;
  private readonly loop = new GameLoop();
  private readonly world: World;
  private readonly environment: Environment;
  private readonly player: Player;
  private readonly controller = new Controller();
  private readonly rig: CameraRig;
  private readonly vehicles: VehicleManager;
  private readonly npcs: NpcManager;
  private readonly physics = new PhysicsWorld();
  private economy: Economy;
  private missions: MissionManager;
  private inventory: Inventory;
  private properties: PropertyManager;
  private readonly audio = new AudioManager();
  private settings: Settings;
  private panel: Panel = "none";
  private waypoint: { x: number; z: number } | null = null;
  private pendingBuy: string | null = null;
  private notice: string | null = null;
  private noticeUntil = 0;
  private time = 0;
  private persistClock = 0;
  private traveled = 0;
  private settled = false;
  private lastPersist = "";
  private disposed = false;
  private readonly onResize: () => void;
  private readonly onPointerDown: () => void;

  constructor(options: GameOptions) {
    this.options = options;
    this.settings = options.settings;
    const save = options.save;
    const width = Math.max(1, options.container.clientWidth);
    const height = Math.max(1, options.container.clientHeight);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = options.settings.shadows;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setPixelRatio(pixelRatio(options.settings));
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.className = "nl-canvas";
    options.container.appendChild(this.renderer.domElement);

    this.physics.static = staticColliders();
    this.world = new World(this.scene);
    this.environment = new Environment(this.scene);
    this.environment.setShadows(options.settings.shadows);
    this.rig = new CameraRig(width / height);
    this.player = new Player(save?.x ?? SPAWN.x, save?.z ?? SPAWN.z, save?.facing ?? SPAWN.yaw);
    if (save) {
      this.player.y = save.y;
      this.player.stamina = save.stamina;
    }
    this.rig.yaw = save?.yaw ?? this.player.facing;
    this.scene.add(this.player.group);

    this.vehicles = new VehicleManager(this.scene);
    if (save) this.vehicles.applyPoses(save.vehicles);
    this.npcs = new NpcManager(this.scene);
    this.economy = new Economy(save?.cash ?? START_CASH);
    this.missions = new MissionManager(FIRST_FARE, save?.missionIndex ?? 0, save?.missionComplete ?? false);
    this.inventory = new Inventory(save?.inventory ?? starterItems());
    this.properties = new PropertyManager(save?.ownedPropertyIds ?? []);
    this.waypoint = save?.waypoint ?? null;
    this.audio.setVolume(options.settings.volume);

    if (save?.drivingId) {
      const vehicle = this.vehicles.vehicles.find((entry) => entry.spec.id === save.drivingId);
      if (vehicle?.driveable) {
        this.vehicles.enter(vehicle);
        this.player.group.visible = false;
        this.rig.yaw = vehicle.heading;
      }
    }

    this.controller.attach(options.container);
    this.onResize = () => this.resize();
    this.onPointerDown = () => {
      this.audio.unlock();
      if (this.panel === "none") {
        try {
          this.options.container.requestPointerLock();
        } catch {
          /* The browser can reject the lock until a gesture lands. */
        }
      }
    };
    window.addEventListener("resize", this.onResize);
    options.container.addEventListener("pointerdown", this.onPointerDown);
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => this.resize());
      observer.observe(options.container);
      this.resizeObserver = observer;
    }
  }

  private resizeObserver: ResizeObserver | null = null;

  start(): void {
    this.loop.start((dt) => this.tick(dt));
    this.publish(true);
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
    this.audio.setVolume(settings.volume);
    this.renderer.shadowMap.enabled = settings.shadows;
    this.environment.setShadows(settings.shadows);
    this.renderer.setPixelRatio(pixelRatio(settings));
    this.resize();
  }

  setPanel(panel: Panel): void {
    this.panel = panel;
    this.pendingBuy = null;
    if (panel !== "none" && document.pointerLockElement) document.exitPointerLock();
    this.publish(true);
  }

  setWaypoint(x: number, z: number): void {
    this.waypoint = { x, z };
    this.flash("Pin dropped.");
    this.publish(true);
  }

  clearWaypoint(): void {
    this.waypoint = null;
    this.publish(true);
  }

  purchase(id: string): void {
    this.confirmPurchase(id);
  }

  saveNow(): void {
    this.persist(true);
    this.flash("Saved on this device.");
    this.publish(true);
  }

  exportSave(): SaveGame {
    const driving = this.vehicles.active;
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      x: this.player.x,
      y: this.player.y,
      z: this.player.z,
      yaw: this.rig.yaw,
      facing: this.player.facing,
      cash: this.economy.cash,
      stamina: this.player.stamina,
      missionIndex: this.missions.stageIndex,
      missionComplete: this.missions.complete,
      inventory: this.inventory.export(),
      ownedPropertyIds: this.properties.export(),
      waypoint: this.waypoint,
      drivingId: driving?.spec.id ?? null,
      vehicles: this.vehicles.exportPoses(),
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop();
    this.controller.detach();
    this.audio.dispose();
    window.removeEventListener("resize", this.onResize);
    this.options.container.removeEventListener("pointerdown", this.onPointerDown);
    this.resizeObserver?.disconnect();
    if (document.pointerLockElement) document.exitPointerLock();
    disposeTree(this.player.group);
    for (const npc of this.npcs.npcs) disposeTree(npc.group);
    this.vehicles.dispose();
    this.world.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private tick(dt: number): void {
    if (this.disposed) return;
    this.time += dt;
    const playing = this.panel === "none";
    const look = this.controller.consumeLook();
    if (playing) this.rig.applyLook(look.x, look.y, this.settings);
    if (Math.abs(look.x) + Math.abs(look.y) > 12) this.settled = true;

    if (this.controller.consumePress("Escape")) {
      if (playing && this.pendingBuy) this.pendingBuy = null;
      else this.setPanel(this.panel === "none" ? "pause" : "none");
    }
    if (this.controller.consumePress("KeyM")) this.setPanel(this.panel === "map" ? "none" : "map");
    if (this.controller.consumePress("KeyI")) {
      this.setPanel(this.panel === "management" ? "none" : "management");
    }
    if (playing && this.controller.consumePress("KeyF")) this.toggleVehicle();
    if (playing && this.controller.consumePress("KeyE")) this.interact();

    const driving = this.vehicles.active;
    if (playing && driving) {
      const delta = wrapAngle(driving.heading - this.rig.yaw);
      this.rig.yaw += delta * (1 - Math.exp(-3.2 * dt));
      this.vehicles.update(dt, this.controller, this.physics);
      this.player.x = driving.x;
      this.player.z = driving.z;
      this.player.y = 0;
      this.player.group.visible = false;
    } else if (playing) {
      const beforeX = this.player.x;
      const beforeZ = this.player.z;
      this.player.update(dt, this.controller, this.rig.yaw, this.physics, this.vehicles.colliders());
      this.traveled += Math.hypot(this.player.x - beforeX, this.player.z - beforeZ);
      if (this.traveled > 6) this.settled = true;
    }

    if (playing) {
      this.npcs.update(dt);
      this.advanceMission();
      this.checkWaypoint();
    }

    this.rig.update(dt, this.player.x, this.player.y, this.player.z, this.physics.static);
    this.environment.follow(this.player.x, this.player.z);
    const objective = this.missions.objectivePoint();
    this.world.update(this.time, this.missions.complete ? null : objective);
    this.renderer.render(this.scene, this.rig.camera);

    const speed = driving?.speed ?? 0;
    this.audio.update(dt, playing && !driving && this.traveled > 0 && this.controller.forward !== 0, this.controller.sprint, Boolean(driving), speed);

    if (this.notice && this.time > this.noticeUntil) this.notice = null;
    this.persistClock += dt;
    if (this.persistClock > 20) {
      this.persistClock = 0;
      this.persist(false);
    }
    this.controller.endFrame();
    this.publish(false);
  }

  private toggleVehicle(): void {
    if (this.vehicles.active) {
      if (Math.abs(this.vehicles.active.speed) > 3) {
        this.flash("Slow down before you step out.");
        return;
      }
      const point = this.vehicles.exitPoint();
      this.vehicles.leave();
      if (point) {
        const placed = this.physics.move(point.x, point.z, GAME_CONFIG.player.radius, this.vehicles.colliders());
        this.player.x = placed.x;
        this.player.z = placed.z;
      }
      this.player.syncMesh();
      return;
    }
    const nearby = this.vehicles.nearestDriveable(this.player.x, this.player.z);
    if (!nearby) return;
    this.vehicles.enter(nearby);
    this.rig.yaw = nearby.heading;
    this.player.group.visible = false;
    this.pendingBuy = null;
  }

  private interact(): void {
    const door = this.properties.nearestDoor(this.player.x, this.player.z);
    if (!door || this.vehicles.active) {
      this.pendingBuy = null;
      return;
    }
    if (door.owned) {
      this.flash("The lights are on. It's yours.");
      return;
    }
    if (this.pendingBuy !== door.id) {
      this.pendingBuy = door.id;
      this.publish(true);
      return;
    }
    this.confirmPurchase(door.id);
  }

  private confirmPurchase(id: string): void {
    const before = this.economy.entries.length;
    const result = this.properties.tryBuy(id, this.economy, this.player.x, this.player.z);
    this.pendingBuy = null;
    if (!result.ok) {
      this.flash(result.reason);
      this.publish(true);
      return;
    }
    this.inventory.add("keys");
    const entry = this.economy.entries[before];
    if (entry) this.options.onLedger(entry);
    this.audio.stinger();
    this.flash("Keys on the table. The loft is yours.");
    this.persist(true);
    this.publish(true);
  }

  private advanceMission(): void {
    const reward = this.missions.update({
      x: this.player.x,
      z: this.player.z,
      drivingId: this.vehicles.active?.spec.id ?? null,
    });
    if (reward <= 0) return;
    const entry = this.economy.credit(reward, "mission");
    this.options.onLedger(entry);
    this.audio.stinger();
    this.flash(`Fare paid. $${reward} is yours.`);
    this.persist(true);
  }

  private checkWaypoint(): void {
    if (!this.waypoint) return;
    if (Math.hypot(this.waypoint.x - this.player.x, this.waypoint.z - this.player.z) > 4) return;
    this.waypoint = null;
    this.flash("You reached the pin.");
  }

  private prompts(): GameSnapshot["prompts"] {
    const sources: PromptSource[] = [];
    const driving = this.vehicles.active;
    if (driving) {
      sources.push({
        x: this.player.x,
        z: this.player.z,
        radius: 1000,
        key: "F",
        label: Math.abs(driving.speed) > 3 ? "Slow down to step out" : "Step out",
      });
    } else {
      const nearby = this.vehicles.nearestDriveable(this.player.x, this.player.z);
      if (nearby) {
        sources.push({ x: nearby.x, z: nearby.z, radius: 3.4, key: "F", label: `Drive the ${nearby.spec.name}` });
      }
      const door = this.properties.nearestDoor(this.player.x, this.player.z);
      if (door?.owned) {
        sources.push({ x: door.doorX, z: door.doorZ, radius: 4, key: "E", label: `${door.name} is yours` });
      } else if (door && this.pendingBuy === door.id) {
        sources.push({
          x: door.doorX,
          z: door.doorZ,
          radius: 4,
          key: "E",
          label: `Confirm $${door.price.toLocaleString("en-US")}`,
        });
      } else if (door) {
        sources.push({
          x: door.doorX,
          z: door.doorZ,
          radius: 4,
          key: "E",
          label: `${door.name} · $${door.price.toLocaleString("en-US")}`,
        });
      }
    }
    return collectPrompts(this.player.x, this.player.z, sources);
  }

  private persist(force: boolean): void {
    const save = this.exportSave();
    const fingerprint = JSON.stringify({ ...save, updatedAt: "" });
    if (!force && fingerprint === this.lastPersist) return;
    this.lastPersist = fingerprint;
    this.options.onPersist(save);
  }

  private publish(force: boolean): void {
    if (!force && this.time - this.lastSnapshot < 0.1) return;
    this.lastSnapshot = this.time;
    const driving = this.vehicles.active;
    const district = districtAt(this.player.x, this.player.z);
    const door = this.properties.nearestDoor(this.player.x, this.player.z);
    const snapshot: GameSnapshot = {
      ready: true,
      panel: this.panel,
      district: district.name,
      cash: this.economy.cash,
      stamina: this.player.stamina,
      objective: this.missions.objective,
      missionTitle: this.missions.complete ? "Shift clear" : this.missions.title,
      missionComplete: this.missions.complete,
      prompts: this.prompts(),
      speedKmh: Math.abs(driving?.speed ?? 0) * 3.6,
      driving: Boolean(driving),
      x: this.player.x,
      z: this.player.z,
      yaw: this.rig.yaw,
      waypoint: this.waypoint,
      objectivePoint: this.missions.complete ? null : this.missions.objectivePoint(),
      properties: this.properties.list(),
      inventory: this.inventory.list(),
      callsign: this.options.callsign,
      notice: this.notice,
      settled: this.settled,
      nearPropertyId: door && !this.vehicles.active ? door.id : null,
    };
    this.options.onSnapshot(snapshot);
  }

  private lastSnapshot = -1;

  private flash(text: string): void {
    this.notice = text;
    this.noticeUntil = this.time + 3.4;
  }

  private resize(): void {
    const width = Math.max(1, this.options.container.clientWidth);
    const height = Math.max(1, this.options.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.rig.resize(width / height);
  }
}

function pixelRatio(settings: Settings): number {
  const cap = settings.quality === "low" ? 1 : settings.quality === "medium" ? 1.25 : 1.75;
  return Math.min(window.devicePixelRatio || 1, cap);
}

function disposeTree(root: Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    obj.geometry.dispose();
    const material = obj.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material.dispose();
  });
}
