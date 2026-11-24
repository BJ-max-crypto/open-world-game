import { SOLIDS } from "@/game/world/coast/layout";

export interface InteriorBox {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  collision: boolean;
  glass?: boolean;
}

function marinaOffice() {
  const found = SOLIDS.find((solid) => solid.id === "marina-office");
  if (!found) throw new Error("Marina Office is missing from the district layout.");
  return found;
}

const office = marinaOffice();

export const MARINA_OFFICE = office;

const wall = 0.34;
const shell = 4.6;
const doorWidth = 1.7;
const south = office.z - office.d / 2;
const north = office.z + office.d / 2;
const west = office.x - office.w / 2;
const east = office.x + office.w / 2;

function box(
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  y: number,
  color: string,
  collision = true,
  glass = false,
): InteriorBox {
  return { id, x, y, z, w, h, d, color, collision, glass };
}

/** Shell, rooms, and furniture for the one enterable office. Coordinates are world space. */
export function marinaPieces(): InteriorBox[] {
  const doorLeft = office.x - doorWidth / 2;
  const doorRight = office.x + doorWidth / 2;
  const southZ = south + wall / 2;
  const leftW = doorLeft - west;
  const rightW = east - doorRight;
  const partitionZ = office.z + 1.6;
  const innerDoor = 1.25;
  const gapLeft = office.x + 1.2;
  const gapRight = gapLeft + innerDoor;

  return [
    box("floor", office.x, office.z, office.w - 0.2, office.d - 0.2, 0.06, 0.03, "#8d8376", false),
    box("ceiling", office.x, office.z, office.w - 0.08, office.d - 0.08, 0.16, 3.55, "#d9d3c8"),
    box("west-wall", west + wall / 2, office.z, wall, office.d, shell, shell / 2, "#d5ddd8"),
    box("east-wall", east - wall / 2, office.z, wall, office.d, shell, shell / 2, "#d5ddd8"),
    box("north-wall", office.x, north - wall / 2, office.w, wall, shell, shell / 2, "#c9c3b8"),
    box("south-left", west + leftW / 2, southZ, leftW, wall, shell, shell / 2, "#d5ddd8"),
    box("south-right", doorRight + rightW / 2, southZ, rightW, wall, shell, shell / 2, "#d5ddd8"),
    box("lintel", office.x, southZ, doorWidth, wall, 2.15, 2.45 + 1.075, "#d5ddd8"),
    box("glass-west", west + wall + 0.02, office.z, 0.04, 2.4, 1.1, 2.15, "#9eb8c4", false, true),
    box("glass-east", east - wall - 0.02, office.z + 0.4, 0.04, 2.2, 1.1, 2.15, "#9eb8c4", false, true),
    box("partition-west", (west + gapLeft) / 2, partitionZ, gapLeft - west, wall, shell, shell / 2, "#cfc6ba"),
    box(
      "partition-east",
      (gapRight + east) / 2,
      partitionZ,
      east - gapRight,
      wall,
      shell,
      shell / 2,
      "#cfc6ba",
    ),
    box("partition-lintel", (gapLeft + gapRight) / 2, partitionZ, innerDoor, wall, 2.2, 2.4 + 1.1, "#cfc6ba"),
    box("desk", office.x - 2.4, office.z - 1.15, 2.4, 0.9, 0.78, 0.39, "#6d5344"),
    box("chair", office.x - 2.4, office.z - 2.15, 0.55, 0.55, 0.95, 0.48, "#3d4c59"),
    box("back-desk", office.x + 3.4, office.z + 3.1, 1.8, 0.8, 0.76, 0.38, "#5c463c"),
    box("back-chair", office.x + 3.4, office.z + 2.25, 0.5, 0.5, 0.9, 0.45, "#24343c"),
    box("shelf", west + 1.1, office.z + 3.15, 0.45, 2.2, 1.8, 0.9, "#8a7564"),
    box("stoop", office.x, south - 0.55, doorWidth + 0.4, 0.7, 0.14, 0.07, "#b7b2a8"),
  ];
}

export function marinaDoor(): { x: number; z: number } {
  return { x: office.x, z: south + 0.2 };
}

/** True when a standing body at this point overlaps a solid interior piece. */
export function interiorBlocks(pieces: readonly InteriorBox[], x: number, z: number, y = 1): boolean {
  return pieces.some((piece) => {
    if (!piece.collision || piece.glass) return false;
    const bottom = piece.y - piece.h / 2;
    const top = piece.y + piece.h / 2;
    if (y < bottom || y > top) return false;
    return Math.abs(x - piece.x) <= piece.w / 2 && Math.abs(z - piece.z) <= piece.d / 2;
  });
}
