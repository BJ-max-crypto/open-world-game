import assert from "node:assert/strict";
import test from "node:test";
import downtown from "../src/game/world/solara/downtown-metrics.json" with { type: "json" };
import phase1 from "../src/game/world/solara/phase1-metrics.json" with { type: "json" };
import expansion from "../docs/masterplan/expansion.json" with { type: "json" };

const SOLARA = { x: 0, z: -10, hx: 36, hz: 40 };
const ANCHOR = { x: 640, z: 620 };

const EXISTING_ROADS = [
  { id: "harbor", x: 0, z: -50, w: 112, d: 8 },
  { id: "north", x: 0, z: 38, w: 112, d: 8 },
  { id: "east", x: 52, z: -6, w: 8, d: 96 },
  { id: "west", x: -52, z: -6, w: 8, d: 96 },
  ...downtown.roads,
];

function box(item: { x: number; z: number; hx?: number; hz?: number; w?: number; d?: number }) {
  return {
    x: item.x,
    z: item.z,
    hx: item.hx ?? (item.w ?? 0) / 2,
    hz: item.hz ?? (item.d ?? 0) / 2,
  };
}

function separated(
  a: { x: number; z: number; hx: number; hz: number },
  b: { x: number; z: number; hx: number; hz: number },
  gap = 0,
) {
  return Math.abs(a.x - b.x) + gap >= a.hx + b.hx || Math.abs(a.z - b.z) + gap >= a.hz + b.hz;
}

function overlapArea(a: { x0: number; x1: number; z0: number; z1: number }, b: { x0: number; x1: number; z0: number; z1: number }) {
  const x = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const z = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
  if (x <= 1 || z <= 1) return 0;
  return x * z;
}

test("phase 1 adds four buildings that miss the existing towers and every road", () => {
  assert.deepEqual(
    phase1.buildings.map((building) => building.id),
    ["lumen", "brisa", "mercado", "nave"],
  );
  const heights = Object.fromEntries(phase1.buildings.map((building) => [building.id, building.height]));
  assert.ok(heights.lumen > 60 && heights.lumen < 100);
  assert.ok(heights.brisa > 45 && heights.brisa < 70);
  assert.ok(heights.mercado > 16 && heights.mercado < 32);
  assert.ok(heights.nave > 14 && heights.nave < 28);
  for (const building of phase1.buildings) {
    const parcel = expansion.phase1.parcels.find((item) => item.id === building.id);
    assert.ok(parcel, building.id);
    assert.ok(building.hx <= parcel.hx && building.hz <= parcel.hz, building.id);
    assert.equal(building.x, parcel.x);
    assert.equal(building.z, parcel.z);
    assert.equal(separated(building, SOLARA, 6), true, building.id);
    for (const other of downtown.buildings) {
      assert.equal(separated(building, other, 8), true, `${building.id} ${other.id}`);
    }
    for (const road of [...EXISTING_ROADS, ...phase1.roads]) {
      assert.equal(separated(building, box(road), 3), true, `${building.id} ${road.id}`);
    }
  }
});

test("phase 1 roads stay on the downtown apron and butt the existing ring", () => {
  for (const road of phase1.roads) {
    assert.ok(road.x - road.w / 2 >= -180, road.id);
    assert.ok(road.x + road.w / 2 <= 180, road.id);
    assert.ok(road.z - road.d / 2 >= -150, road.id);
    assert.ok(road.z + road.d / 2 <= 140, road.id);
  }
  const wharf = phase1.roads.find((road) => road.id === "wharf");
  const meridian = phase1.roads.find((road) => road.id === "meridian");
  assert.ok(wharf && wharf.d === 12);
  assert.ok(meridian && meridian.d === 18);
});

test("expansion districts touch without covering each other or the built towers", () => {
  const districts = expansion.districts.map((district) => ({
    id: district.id,
    x0: district.x0,
    x1: district.x1,
    z0: district.z0,
    z1: district.z1,
  }));
  for (let i = 0; i < districts.length; i += 1) {
    for (let j = i + 1; j < districts.length; j += 1) {
      assert.equal(overlapArea(districts[i], districts[j]), 0, `${districts[i].id} ${districts[j].id}`);
    }
  }
  for (const water of expansion.water) {
    for (const district of districts) {
      assert.equal(overlapArea(water, district), 0, `${water.id} ${district.id}`);
    }
  }
  const downtown = districts.find((district) => district.id === "downtown");
  assert.ok(downtown);
  const towers = [
    { id: "solara", x: ANCHOR.x, z: ANCHOR.z },
    { id: "caliza", x: ANCHOR.x - 80, z: ANCHOR.z + 4 },
    { id: "vanta", x: ANCHOR.x + 6.9, z: ANCHOR.z + 68.26 },
    { id: "cayo", x: ANCHOR.x + 20, z: ANCHOR.z - 76 },
  ];
  for (const tower of towers) {
    assert.ok(tower.x > downtown.x0 && tower.x < downtown.x1, tower.id);
    assert.ok(tower.z > downtown.z0 && tower.z < downtown.z1, tower.id);
  }
  for (const building of phase1.buildings) {
    const worldX = building.x + ANCHOR.x;
    const worldZ = building.z + ANCHOR.z;
    assert.ok(worldX > downtown.x0 && worldX < downtown.x1, building.id);
    assert.ok(worldZ > downtown.z0 && worldZ < downtown.z1, building.id);
  }
});
