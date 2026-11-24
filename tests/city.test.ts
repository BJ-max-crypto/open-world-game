import assert from "node:assert/strict";
import test from "node:test";
import { ROAD_HALF, WORLD_HALF } from "../src/game/engine/GameConfig.ts";
import { circleHitsBox, resolveCircle } from "../src/game/physics/Collision.ts";
import { stepVertical } from "../src/game/physics/PhysicsWorld.ts";
import { CAB_SPAWN, DROPOFF, SPAWN, blockedByCity, buildingBox, buildings, staticColliders } from "../src/game/world/District.ts";
import { PROPERTIES } from "../src/game/properties/Property.ts";
import { VEHICLE_SPECS } from "../src/game/vehicles/catalog.ts";

test("buildings stay off the roads and inside the district", () => {
  const boxes = buildings().map(buildingBox);
  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];
    assert.ok(box.minX > -WORLD_HALF && box.maxX < WORLD_HALF);
    assert.ok(box.minZ > -WORLD_HALF && box.maxZ < WORLD_HALF);
    const hitsHorizontal = box.minZ < ROAD_HALF && box.maxZ > -ROAD_HALF;
    const hitsVertical = box.minX < ROAD_HALF && box.maxX > -ROAD_HALF;
    assert.equal(hitsHorizontal || hitsVertical, false, boxes[i].id);
    for (let j = i + 1; j < boxes.length; j += 1) {
      const other = boxes[j];
      const overlap = box.minX < other.maxX && box.maxX > other.minX && box.minZ < other.maxZ && box.maxZ > other.minZ;
      assert.equal(overlap, false, `${box.id} overlaps ${other.id}`);
    }
  }
});

test("spawn, cab, dropoff, and doors are walkable", () => {
  const points = [
    SPAWN,
    CAB_SPAWN,
    DROPOFF,
    ...PROPERTIES.map((property) => ({ x: property.doorX, z: property.doorZ })),
  ];
  for (const point of points) {
    assert.equal(blockedByCity(point.x, point.z, 0.42), false, `${point.x},${point.z}`);
  }
  for (const vehicle of VEHICLE_SPECS) {
    assert.equal(blockedByCity(vehicle.x, vehicle.z, 0.4), false, vehicle.id);
  }
});

test("collision slides a circle out of a wall", () => {
  const boxes = staticColliders().filter((box) => box.id === "bound-n");
  const resolved = resolveCircle({ x: 0, z: -120.2, radius: 0.42 }, boxes);
  assert.ok(resolved.z > -120);
  assert.equal(circleHitsBox({ ...resolved, radius: 0.42 }, boxes[0]), false);
});

test("a jump returns to the ground", () => {
  let state = { y: 0, vy: 7.4, grounded: false };
  for (let i = 0; i < 120; i += 1) state = stepVertical(state, 1 / 60, 24);
  assert.equal(state.y, 0);
  assert.equal(state.grounded, true);
});
