export interface PropertyDef {
  id: string;
  name: string;
  price: number;
  blurb: string;
  x: number;
  z: number;
  doorX: number;
  doorZ: number;
}

export const PROPERTIES: PropertyDef[] = [
  {
    id: "loft",
    name: "Night Loft",
    price: 600,
    blurb: "Third floor over a closed tailor. The radiator works.",
    x: -74,
    z: -74,
    doorX: -74,
    doorZ: -64.3,
  },
  {
    id: "yard-office",
    name: "Yard Office",
    price: 4000,
    blurb: "A desk, a loading door, and a view of the cranes.",
    x: 36,
    z: 40,
    doorX: 36,
    doorZ: 49.6,
  },
];

export function propertyById(id: string): PropertyDef | undefined {
  return PROPERTIES.find((property) => property.id === id);
}
