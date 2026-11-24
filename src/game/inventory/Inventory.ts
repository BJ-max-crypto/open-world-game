export interface ItemDef {
  id: string;
  name: string;
  detail: string;
}

export const ITEM_CATALOG: ItemDef[] = [
  { id: "phone", name: "Phone", detail: "District map, fares, and a cracked screen." },
  { id: "metro", name: "Metro card", detail: "Two rides left on the harbor line." },
  { id: "keys", name: "Loft keys", detail: "Civic Core. The stairwell light is out." },
];

const KNOWN = new Set(ITEM_CATALOG.map((item) => item.id));

export class Inventory {
  private counts = new Map<string, number>();

  constructor(entries: { id: string; quantity: number }[] = []) {
    for (const entry of entries) this.add(entry.id, entry.quantity);
  }

  add(id: string, quantity = 1): void {
    if (!KNOWN.has(id) || quantity <= 0) return;
    this.counts.set(id, (this.counts.get(id) ?? 0) + quantity);
  }

  has(id: string): boolean {
    return (this.counts.get(id) ?? 0) > 0;
  }

  list(): { id: string; name: string; detail: string; quantity: number }[] {
    return ITEM_CATALOG.filter((item) => this.has(item.id)).map((item) => ({
      ...item,
      quantity: this.counts.get(item.id) ?? 0,
    }));
  }

  export(): { id: string; quantity: number }[] {
    return this.list().map(({ id, quantity }) => ({ id, quantity }));
  }
}

export function starterItems(): { id: string; quantity: number }[] {
  return [
    { id: "phone", quantity: 1 },
    { id: "metro", quantity: 1 },
  ];
}
