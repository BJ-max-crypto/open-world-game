import assert from "node:assert/strict";
import test from "node:test";
import {
  BEDS,
  CURB_HEIGHT,
  FRONT_PALMS,
  POOLS,
  SHRUBS,
  STUDY,
  harborLayout,
} from "../src/game/world/solara/harbor-front.ts";

const ROAD = { x: 0, z: -50, w: 112, d: 8 };
const LANE = { x: 0, z: -50, w: 90, d: 7.2 };

function hits(a: { x: number; z: number; w: number; d: number }, b: { x: number; z: number; w: number; d: number }, pad = 0) {
  return Math.abs(a.x - b.x) < a.w / 2 + b.w / 2 + pad && Math.abs(a.z - b.z) < a.d / 2 + b.d / 2 + pad;
}

test("the harbor front stays on one street and off the tower and the pools", () => {
  const layout = harborLayout();
  const pieces = [
    ...layout.mortar,
    ...layout.pavers,
    ...layout.sidewalk,
    ...layout.curbs,
    ...layout.ramps,
    ...layout.gutters,
    ...layout.beds,
  ];
  assert.ok(layout.pavers.length > 80);
  assert.ok(layout.sidewalk.length > 40);
  assert.equal(CURB_HEIGHT <= 0.14, true);
  for (const piece of pieces) {
    assert.ok(piece.x - piece.w / 2 >= STUDY.minX, piece.kind);
    assert.ok(piece.x + piece.w / 2 <= STUDY.maxX, piece.kind);
    assert.ok(piece.z - piece.d / 2 >= STUDY.minZ, `${piece.kind} ${piece.z}`);
    assert.ok(piece.z + piece.d / 2 <= STUDY.maxZ, `${piece.kind} ${piece.z}`);
    assert.ok(piece.h <= 0.14, piece.kind);
    for (const pool of POOLS) {
      assert.equal(hits(piece, pool, 0.05), false, `${piece.kind} pool`);
    }
  }
  for (const piece of pieces) {
    if (piece.kind === "gutter") {
      assert.equal(hits(piece, ROAD), true);
      continue;
    }
    if (piece.kind === "ramp") continue;
    assert.equal(hits(piece, LANE), false, `${piece.kind} enters the lane`);
  }
});

test("sidewalks meet the plaza and the crosswalk curb is open", () => {
  const layout = harborLayout();
  const plaza = layout.mortar.find((piece) => piece.kind === "mortar" && piece.w > 40 && piece.z < -25);
  const walk = layout.sidewalk.filter((piece) => Math.abs(piece.x) < 20);
  assert.ok(plaza);
  assert.ok(walk.length > 8);
  const walkNorth = Math.max(...walk.map((piece) => piece.z + piece.d / 2));
  const plazaSouth = plaza.z - plaza.d / 2;
  assert.ok(walkNorth >= plazaSouth - 0.4, `${walkNorth} vs ${plazaSouth}`);
  const blocked = layout.curbs.some((curb) => Math.abs(curb.x) < 3.2 && Math.abs(curb.z + 45.72) < 0.4);
  assert.equal(blocked, false);
  for (const shrub of SHRUBS) {
    assert.equal(
      BEDS.some((bed) => hits({ x: shrub.x, z: shrub.z, w: 0.2, d: 0.2 }, bed, 0.15)),
      true,
      `${shrub.x},${shrub.z}`,
    );
  }
  for (const palm of FRONT_PALMS) {
    assert.equal(
      BEDS.some((bed) => hits({ x: palm.x, z: palm.z, w: 0.2, d: 0.2 }, bed, 0.3)),
      true,
      `${palm.x}`,
    );
  }
});
