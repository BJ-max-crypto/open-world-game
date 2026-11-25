import assert from "node:assert/strict";
import test from "node:test";
import { ROADS, SOLIDS, pointInside } from "../src/game/world/coast/layout.ts";
import { BOAT_PATHS, LANES, WALKS, lanePose, signalPhase, waveHeight } from "../src/game/world/life/routes.ts";
import { blockedByBuilding, createLife, stepLife } from "../src/game/world/life/simulate.ts";

test("sidewalks and lanes stay out of buildings and the water", () => {
  for (const loop of WALKS) {
    for (const point of loop.points) {
      assert.equal(blockedByBuilding(point.x, point.z, 0.15), false, `${loop.id} hits a building at ${point.x},${point.z}`);
      assert.ok(point.z > -23, `${loop.id} is in the water`);
    }
  }
  for (const lane of LANES) {
    for (let step = 0; step <= 8; step += 1) {
      const pose = lanePose(lane, (Math.abs(lane.to - lane.from) * step) / 8);
      const onRoad = ROADS.some((road) => pointInside(road, pose.x, pose.z, -0.2));
      assert.equal(onRoad, true, `${lane.id} leaves the road at ${pose.x},${pose.z}`);
      assert.equal(blockedByBuilding(pose.x, pose.z, 0.4), false, `${lane.id} hits a building`);
      for (const parked of SOLIDS.filter((solid) => solid.kind === "vehicle")) {
        const clear = Math.hypot(parked.x - pose.x, parked.z - pose.z);
        assert.ok(clear > 1.5, `${lane.id} passes ${parked.id} at ${clear.toFixed(2)}m`);
      }
    }
  }
});

test("traffic stops for the crossing phase and boats stay offshore", () => {
  assert.equal(signalPhase(1), "coast");
  assert.equal(signalPhase(10), "cross");
  const state = createLife();
  state.time = 10;
  const coast = state.cars.find((car) => LANES[car.lane].id === "coast-east");
  assert.ok(coast);
  coast.distance = 32;
  coast.speed = 7;
  for (let i = 0; i < 20; i += 1) stepLife(state, 0.05);
  assert.ok(coast.speed < 1, `coast car still moving at ${coast.speed}`);
  assert.ok(lanePose(LANES[coast.lane], coast.distance).x < -3);

  for (let i = 0; i < 40; i += 1) stepLife(state, 0.05);
  for (const boat of state.boats) {
    assert.ok(boat.z < -26, `${boat.kind} reached the shore`);
    const path = BOAT_PATHS[boat.path];
    const west = Math.min(path.from, path.to) - 0.1;
    const east = Math.max(path.from, path.to) + 0.1;
    assert.ok(boat.x > west && boat.x < east);
  }
  assert.notEqual(waveHeight(0, -30, 0), waveHeight(4, -30, 1.4));
});

test("a pedestrian can wait, talk, and step into a doorway", () => {
  const state = createLife();
  state.time = 0.2;
  const walker = state.peds[0];
  const loop = WALKS[walker.loop];
  const doorIndex = loop.points.findIndex((point) => point.door);
  assert.ok(doorIndex >= 0);
  walker.to = doorIndex;
  walker.cooldown = 0;
  walker.id = 0;
  const door = loop.points[doorIndex];
  walker.x = door.x;
  walker.z = door.z;
  stepLife(state, 0.05);
  assert.equal(walker.mode, "approach");
  for (let i = 0; i < 80 && walker.mode !== "inside"; i += 1) stepLife(state, 0.05);
  assert.equal(walker.mode, "inside");
  assert.equal(blockedByBuilding(walker.x, walker.z, -0.2), false);
});
