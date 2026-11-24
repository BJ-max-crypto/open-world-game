import { Economy } from "@/game/economy/Economy";
import { nearestInteractable, type Interactable } from "@/game/interaction/nearest";
import {
  MISSION_TITLE,
  PACKAGE_IDS,
  STARTING_CASH,
  acceptDelivery,
  collectPackage,
  createDelivery,
  objectiveFor,
  packagesReady,
  turnInDelivery,
  waypointKind,
  type DeliveryState,
  type DeliveryStatus,
} from "@/game/missions/firstOpportunity";
import type { CoastSave } from "@/game/session/coastSave";
import { CONTACT, PACKAGES, WAREHOUSE_POINT } from "@/game/world/coast/layout";

export type CoastPanel = "offer" | "reminder" | "complete";
export type SessionChange = "none" | "prompt" | "view" | "save";

export interface CoastSnapshot {
  cash: number;
  status: DeliveryStatus;
  title: string;
  objective: string;
  collected: number;
  total: number;
  collectedIds: string[];
  prompt: { id: string; label: string } | null;
  panel: CoastPanel | null;
  panelBody: string;
  notice: string | null;
  waypoint: { x: number; z: number } | null;
}

export class CoastSession {
  private readonly economy: Economy;
  private delivery: DeliveryState;
  private prompt: { id: string; label: string } | null = null;
  panel: CoastPanel | null = null;
  notice: string | null = null;

  constructor(saved: CoastSave | null) {
    this.economy = new Economy(saved?.cash ?? STARTING_CASH);
    this.delivery = saved
      ? { status: saved.status, collected: [...saved.packages] }
      : createDelivery();
  }

  get suspended(): boolean {
    return this.panel !== null;
  }

  /** Reads the player and an E press. Money changes only inside activate. */
  tick(x: number, z: number, interact: boolean): SessionChange {
    if (this.panel) return "none";
    const nearest = nearestInteractable(x, z, this.sources(), this.prompt?.id ?? null);
    const nextPrompt = nearest ? { id: nearest.id, label: nearest.label } : null;
    let kind: SessionChange = samePrompt(this.prompt, nextPrompt) ? "none" : "prompt";
    this.prompt = nextPrompt;
    if (!interact || !nearest) return kind;
    const outcome = this.activate(nearest.id);
    if (!outcome) return kind;
    const after = nearestInteractable(x, z, this.sources(), null);
    this.prompt = after ? { id: after.id, label: after.label } : null;
    return outcome;
  }

  accept(): boolean {
    const next = acceptDelivery(this.delivery);
    if (next === this.delivery) return false;
    this.delivery = next;
    this.panel = null;
    this.notice = "Delivery accepted. Warehouse 3 is up the cross street.";
    return true;
  }

  dismiss(): void {
    this.panel = null;
  }

  snapshot(): CoastSnapshot {
    const where = waypointKind(this.delivery);
    return {
      cash: this.economy.cash,
      status: this.delivery.status,
      title: MISSION_TITLE,
      objective: objectiveFor(this.delivery),
      collected: this.delivery.collected.length,
      total: PACKAGE_IDS.length,
      collectedIds: [...this.delivery.collected],
      prompt: this.prompt ? { ...this.prompt } : null,
      panel: this.panel,
      panelBody: panelBody(this.panel, this.delivery, this.economy.cash),
      notice: this.notice,
      waypoint: where === "warehouse" ? WAREHOUSE_POINT : where === "contact" ? { x: CONTACT.x, z: CONTACT.z } : null,
    };
  }

  toSave(): CoastSave {
    return {
      version: 1,
      cash: this.economy.cash,
      status: this.delivery.status,
      packages: [...this.delivery.collected],
    };
  }

  private sources(): Interactable[] {
    const list: Interactable[] = [
      { id: CONTACT.id, x: CONTACT.x, z: CONTACT.z, radius: 2.15, label: contactLabel(this.delivery) },
    ];
    if (this.delivery.status !== "active") return list;
    for (const pkg of PACKAGES) {
      if (this.delivery.collected.includes(pkg.id)) continue;
      list.push({ id: pkg.id, x: pkg.x, z: pkg.z, radius: 1.7, label: "Pick up package" });
    }
    return list;
  }

  private activate(id: string): "view" | "save" | null {
    if (id === CONTACT.id) return this.talk();
    const next = collectPackage(this.delivery, id);
    if (next === this.delivery) return null;
    this.delivery = next;
    this.notice = packagesReady(next)
      ? "All three packages. Head back to Inez."
      : `Package collected. ${next.collected.length}/${PACKAGE_IDS.length}`;
    return "save";
  }

  private talk(): "view" | "save" {
    if (this.delivery.status === "available") {
      this.panel = "offer";
      return "view";
    }
    if (this.delivery.status === "active" && packagesReady(this.delivery)) {
      const result = turnInDelivery(this.delivery);
      if (result.reward > 0) {
        this.economy.credit(result.reward, "mission");
        this.delivery = result.state;
        this.panel = "complete";
        this.notice = "Received $500";
        return "save";
      }
    }
    this.panel = "reminder";
    return "view";
  }
}

function contactLabel(state: DeliveryState): string {
  if (state.status === "available") return "Talk to Inez";
  if (state.status === "complete") return "Talk to Inez";
  if (packagesReady(state)) return "Turn in the delivery";
  return "Check in with Inez";
}

function panelBody(panel: CoastPanel | null, state: DeliveryState, cash: number): string {
  if (panel === "offer") {
    return "Inez Calder needs three crates carried up from the Warehouse 3 apron. Bring them back here and the job pays $500.";
  }
  if (panel === "complete") {
    return `The crates are in. $500 is yours. You now have $${cash}.`;
  }
  if (panel === "reminder" && state.status === "complete") {
    return "That's the job. The money is already on you.";
  }
  if (panel === "reminder") {
    const left = PACKAGE_IDS.length - state.collected.length;
    return `Warehouse 3 is north, past the cross street. ${left} package${left === 1 ? "" : "s"} still on the apron.`;
  }
  return "";
}

function samePrompt(a: { id: string; label: string } | null, b: { id: string; label: string } | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.label === b.label;
}
