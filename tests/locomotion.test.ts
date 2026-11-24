import assert from "node:assert/strict";
import test from "node:test";
import { nextClip } from "../src/game/player/locomotion.ts";
import { interiorBlocks, marinaDoor, marinaPieces } from "../src/game/world/interiors/marinaOffice.ts";
import { mapToWorld, worldToMap } from "../src/game/world/map/project.ts";

test("walking, sprinting, jumping, and landing pick different clips", () => {
  const idle = { clip: "idle" as const, land: 0 };
  const walk = nextClip(idle, { speed: 1.4, vertical: 0, grounded: true, sprinting: false }, 0.016);
  assert.equal(walk.clip, "walk");
  const run = nextClip(walk, { speed: 4.2, vertical: 0, grounded: true, sprinting: true }, 0.016);
  assert.equal(run.clip, "run");
  const jump = nextClip(run, { speed: 1, vertical: 4, grounded: false, sprinting: false }, 0.016);
  assert.equal(jump.clip, "jump");
  const fall = nextClip(jump, { speed: 1, vertical: -2, grounded: false, sprinting: false }, 0.016);
  assert.equal(fall.clip, "fall");
  const land = nextClip(fall, { speed: 0.2, vertical: 0, grounded: true, sprinting: false }, 0.016);
  assert.equal(land.clip, "land");
  const settled = nextClip(land, { speed: 0, vertical: 0, grounded: true, sprinting: false }, 1);
  assert.equal(settled.clip, "idle");
});

test("the marina door is a real opening and the desk stops you", () => {
  const pieces = marinaPieces();
  const door = marinaDoor();
  for (let step = -1.2; step <= 1.6; step += 0.3) {
    assert.equal(interiorBlocks(pieces, door.x, door.z + step), false, `door blocked at ${step}`);
  }
  const desk = pieces.find((piece) => piece.id === "desk");
  assert.ok(desk);
  assert.equal(interiorBlocks(pieces, desk.x, desk.z, 0.4), true);
});

test("the map uses one north-up projection", () => {
  const view = { width: 200, height: 200, centerX: 0, centerZ: 0, span: 100 };
  const north = worldToMap(0, 10, view);
  const south = worldToMap(0, -10, view);
  assert.ok(north.py < 100);
  assert.ok(south.py > 100);
  const back = mapToWorld(north.px, north.py, view);
  assert.ok(Math.abs(back.x) < 1e-6);
  assert.ok(Math.abs(back.z - 10) < 1e-6);
});
