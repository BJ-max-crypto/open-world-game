import assert from "node:assert/strict";
import test from "node:test";
import downtown from "../src/game/world/solara/downtown-metrics.json" with { type: "json" };
import phase1 from "../src/game/world/solara/phase1-metrics.json" with { type: "json" };
import scene from "../src/game/world/solara/streetscape.json" with { type: "json" };
import {
  allRoads,
  contains,
  halfBox,
  laneMarkings,
  medianBeds,
  overlapArea,
  roadPaint,
  separated,
  streetSymbols,
  type HalfBox,
} from "../src/game/world/solara/streetscape.ts";

const SOLARA = { id: "solara", x: 0, z: -7.9, hx: 36, hz: 32.1, height: 180 };

const towers = [SOLARA, ...downtown.buildings, ...phase1.buildings];

function hit(a: HalfBox, b: HalfBox) {
  return overlapArea(a, b) > 0.2;
}

test("downtown streetscape keeps the towers and adds only low street buildings", () => {
  assert.deepEqual(
    scene.pavilions.map((pavilion) => pavilion.id),
    ["marea", "sombra", "isla"],
  );
  for (const pavilion of scene.pavilions) {
    assert.ok(pavilion.h < 12, pavilion.id);
    assert.ok(pavilion.h > 4, pavilion.id);
    const footprint = halfBox(pavilion);
    assert.equal(
      scene.surfaces.some((surface) => surface.kind === "stone" && contains(halfBox(surface), footprint, 0.05)),
      true,
      `${pavilion.id} pad`,
    );
    for (const tower of towers) {
      assert.equal(separated(footprint, tower, 3), true, `${pavilion.id} ${tower.id}`);
    }
    for (const road of allRoads()) {
      assert.equal(separated(footprint, halfBox(road), 2.5), true, `${pavilion.id} ${road.x},${road.z}`);
    }
  }
});

test("block surfaces stay off the towers and off the asphalt, except the service lane", () => {
  for (const surface of scene.surfaces) {
    const box = halfBox(surface);
    for (const tower of towers) {
      assert.equal(hit(box, tower), false, `${surface.id} ${tower.id}`);
    }
    if (surface.kind === "alley") continue;
    for (const road of allRoads()) {
      assert.equal(hit(box, halfBox(road)), false, `${surface.id} road`);
    }
  }
  const kinds = new Set(scene.surfaces.map((surface) => surface.kind));
  for (const kind of ["field", "lawn", "bed", "stone", "path", "parking", "alley"]) {
    assert.equal(kinds.has(kind), true, kind);
  }
});

test("lane paint and the boulevard median sit on the roads and miss the towers", () => {
  const roads = allRoads().map(halfBox);
  assert.ok(laneMarkings().length > 40);
  assert.ok(medianBeds().length >= 4);
  for (const mark of roadPaint()) {
    const box = halfBox(mark);
    assert.equal(
      roads.some((road) => contains(road, box)),
      true,
      `paint ${mark.x},${mark.z}`,
    );
    for (const tower of towers) assert.equal(hit(box, tower), false, `paint ${tower.id}`);
  }
  const meridian = halfBox(phase1.roads.find((road) => road.id === "meridian")!);
  for (const bed of medianBeds()) {
    assert.equal(contains(meridian, halfBox(bed)), true, `median ${bed.x}`);
    for (const symbol of streetSymbols()) {
      assert.equal(hit(halfBox(bed), halfBox(symbol)), false, `median covers ${symbol.x}`);
    }
  }
});

test("palms, shrubs, benches, and lamps stay out of towers and driving lanes", () => {
  const roads = allRoads().map(halfBox);
  const medians = medianBeds().map(halfBox);
  const points = [
    ...scene.palms,
    ...scene.shrubs,
    ...scene.benches,
    ...scene.lamps,
    ...scene.planters,
    ...scene.tables,
  ];
  assert.ok(scene.palms.length >= 30);
  const scales = new Set(scene.palms.map((palm) => palm.s));
  assert.ok(scales.size >= 6);
  for (const point of points) {
    const box = { x: point.x, z: point.z, hx: 0.4, hz: 0.4 };
    for (const tower of towers) assert.equal(hit(box, tower), false, `${point.x},${point.z} ${tower.id}`);
    const onRoad = roads.find((road) => hit(box, road));
    if (!onRoad) continue;
    assert.equal(
      medians.some((median) => contains(median, box, 0.2)),
      true,
      `${point.x},${point.z} is in a driving lane`,
    );
  }
  for (const canopy of scene.canopies) {
    const box = halfBox(canopy);
    for (const tower of towers) assert.equal(separated(box, tower, 2), true, canopy.id);
  }
});
