import assert from "node:assert/strict";
import test from "node:test";
import metrics from "../src/game/world/solara/downtown-metrics.json" with { type: "json" };

/** Solara's podium, canopy, and plaza apron. New buildings stay outside it. */
const SOLARA = { x: 0, z: -10, hx: 28, hz: 32 };

function separated(
  a: { x: number; z: number; hx: number; hz: number },
  b: { x: number; z: number; hx: number; hz: number },
  gap = 0,
) {
  return Math.abs(a.x - b.x) + gap >= a.hx + b.hx || Math.abs(a.z - b.z) + gap >= a.hz + b.hz;
}

test("the three new buildings stay off Solara, the roads, and each other", () => {
  assert.equal(metrics.buildings.length, 3);
  const heights = Object.fromEntries(metrics.buildings.map((building) => [building.id, building.height]));
  assert.ok(heights.caliza >= 130 && heights.caliza <= 150);
  assert.ok(heights.vanta >= 100 && heights.vanta <= 120);
  assert.ok(heights.cayo >= 28 && heights.cayo <= 48);
  for (const building of metrics.buildings) {
    assert.equal(separated(building, SOLARA), true, building.id);
    for (const road of metrics.roads) {
      const rect = { x: road.x, z: road.z, hx: road.w / 2, hz: road.d / 2 };
      assert.equal(separated(building, rect, 4), true, `${building.id} ${road.id}`);
    }
  }
  for (let i = 0; i < metrics.buildings.length; i += 1) {
    for (let j = i + 1; j < metrics.buildings.length; j += 1) {
      assert.equal(separated(metrics.buildings[i], metrics.buildings[j], 8), true);
    }
  }
});
