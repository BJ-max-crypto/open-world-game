import type { Economy } from "@/game/economy/Economy";
import { PROPERTIES, propertyById, type PropertyDef } from "@/game/properties/Property";

const BUY_RADIUS = 4;

export class PropertyManager {
  private owned = new Set<string>();

  constructor(ownedIds: string[] = []) {
    for (const id of ownedIds) {
      if (propertyById(id)) this.owned.add(id);
    }
  }

  owns(id: string): boolean {
    return this.owned.has(id);
  }

  list(): (PropertyDef & { owned: boolean })[] {
    return PROPERTIES.map((property) => ({ ...property, owned: this.owned.has(property.id) }));
  }

  nearestDoor(x: number, z: number): (PropertyDef & { owned: boolean }) | null {
    let best: (PropertyDef & { owned: boolean }) | null = null;
    let bestDistance = BUY_RADIUS;
    for (const property of this.list()) {
      const distance = Math.hypot(property.doorX - x, property.doorZ - z);
      if (distance <= bestDistance) {
        best = property;
        bestDistance = distance;
      }
    }
    return best;
  }

  tryBuy(id: string, economy: Economy, x: number, z: number): { ok: true } | { ok: false; reason: string } {
    const property = propertyById(id);
    if (!property) return { ok: false, reason: "That listing is gone." };
    if (this.owned.has(id)) return { ok: false, reason: "You already have the keys." };
    if (Math.hypot(property.doorX - x, property.doorZ - z) > BUY_RADIUS) {
      return { ok: false, reason: "Walk up to the door." };
    }
    if (!economy.canAfford(property.price)) {
      return { ok: false, reason: `You need $${property.price - economy.cash} more.` };
    }
    const paid = economy.debit(property.price, "property");
    if (!paid) return { ok: false, reason: "The payment did not go through." };
    this.owned.add(id);
    return { ok: true };
  }

  export(): string[] {
    return [...this.owned];
  }
}
