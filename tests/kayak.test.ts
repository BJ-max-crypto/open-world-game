import assert from "node:assert/strict";
import test from "node:test";
import {
  KAYAK_DOCK,
  KAYAK_MOORING,
  SHORE_LIMIT_Z,
  canBoard,
  canStepOff,
  createKayak,
  hullClear,
  kayakSurface,
  stepKayak,
} from "../src/game/world/life/kayak.ts";
import { waveHeight } from "../src/game/world/life/routes.ts";

const still = { forward: false, back: false, left: false, right: false, sprint: false };

test("a paddled kayak stays off the land, the dock, and other boats", () => {
  const moored = createKayak();
  assert.equal(hullClear(moored.x, moored.z, moored.yaw, []), true);
  assert.ok(moored.z < SHORE_LIMIT_Z);

  let kayak = { ...moored, occupied: true, z: -36, yaw: 0, speed: 2.2 };
  for (let i = 0; i < 160; i += 1) kayak = stepKayak(kayak, { ...still, forward: true }, 0.05, []);
  assert.ok(kayak.z + 1.003 * 2.15 <= SHORE_LIMIT_Z + 0.05, `bow crossed the shore at z ${kayak.z}`);
  assert.equal(hullClear(kayak.x, kayak.z, kayak.yaw, []), true);

  const besideDock = { ...moored, occupied: true, x: KAYAK_DOCK.x, z: KAYAK_DOCK.z, yaw: Math.PI / 2, speed: 1 };
  const pushed = stepKayak(besideDock, { ...still, forward: true }, 0.05, []);
  assert.ok(Math.abs(pushed.x - KAYAK_DOCK.x) > 0.4, "the hull should slide off the dock");
  assert.equal(hullClear(pushed.x, pushed.z, pushed.yaw, []), true);

  const started = { ...moored, occupied: true, yaw: Math.PI / 2, speed: 2 };
  const traffic = [{ x: started.x + 1.2, z: started.z, radius: 3 }];
  let crowded = started;
  for (let i = 0; i < 10; i += 1) crowded = stepKayak(crowded, { ...still, forward: true, right: true }, 0.05, traffic);
  assert.notEqual(crowded.yaw, started.yaw);
  assert.ok(Math.hypot(crowded.x - traffic[0].x, crowded.z - traffic[0].z) >= traffic[0].radius - 0.2);
});

test("boarding and stepping off use the dock, and the hull sits in the wave", () => {
  const kayak = createKayak();
  const alongside = { x: KAYAK_DOCK.x + KAYAK_DOCK.w / 2, z: kayak.z };
  assert.equal(canBoard(alongside.x, alongside.z, kayak), true);
  assert.equal(canBoard(10, 10, kayak), false);
  const aboard = { ...kayak, occupied: true };
  assert.equal(canStepOff(aboard), true);
  const offshore = { ...aboard, x: 20, z: -40 };
  assert.equal(canStepOff(offshore), false);
  const y0 = kayakSurface(0, -30, 0);
  const y1 = kayakSurface(4, -30, 1.3);
  assert.notEqual(y0, y1);
  assert.ok(Math.abs(y0 - waveHeight(0, -30, 0)) < 1e-6);
});
