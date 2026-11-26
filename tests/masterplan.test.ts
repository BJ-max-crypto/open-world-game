import assert from "node:assert/strict";
import test from "node:test";
import world from "../docs/masterplan/world.json" with { type: "json" };
import { CONTACT, SPAWN } from "../src/game/world/coast/layout.ts";
import { SHORE_Z } from "../src/game/world/life/routes.ts";
import {
  ANCHOR,
  CHUNK_METERS,
  DISTRICTS,
  WORLD_BOUNDS,
  chunkOf,
  districtAt,
  worldFromLocal,
} from "../src/game/world/masterplan/frame.ts";

test("the approved anchor maps the marina into its district", () => {
  assert.equal(ANCHOR.x, world.prototypeAnchor.worldX);
  assert.equal(ANCHOR.z, world.prototypeAnchor.worldZ);
  assert.equal(world.prototypeAnchor.yaw, 0);
  assert.equal(CHUNK_METERS, 200);
  assert.deepEqual(WORLD_BOUNDS, world.bounds);

  const shore = worldFromLocal(0, SHORE_Z);
  assert.equal(shore.z, 596);
  const office = worldFromLocal(CONTACT.x, CONTACT.z);
  assert.equal(districtAt(office.x, office.z)?.id, "marina");
  const spawn = worldFromLocal(SPAWN.x, SPAWN.z);
  assert.equal(districtAt(spawn.x, spawn.z)?.id, "marina");
  assert.equal(districtAt(-240, 1080)?.id, "downtown");
  assert.equal(districtAt(2140, 180)?.id, "ocean");
  assert.equal(districtAt(2700, 0), null);
});

test("district rectangles match the plan and do not overlap", () => {
  assert.equal(DISTRICTS.length, world.districts.length);
  for (const district of world.districts) {
    const live = DISTRICTS.find((item) => item.id === district.id);
    assert.ok(live, district.id);
    assert.equal(live.x0, district.x0);
    assert.equal(live.x1, district.x1);
    assert.equal(live.z0, district.z0);
    assert.equal(live.z1, district.z1);
  }
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    for (let j = i + 1; j < DISTRICTS.length; j += 1) {
      const a = DISTRICTS[i];
      const b = DISTRICTS[j];
      const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const overlapZ = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
      assert.ok(overlapX <= 1 || overlapZ <= 1, `${a.id} overlaps ${b.id}`);
    }
  }
});

test("the playable block straddles the marina chunks around the anchor", () => {
  const shore = chunkOf(worldFromLocal(0, SHORE_Z).x, worldFromLocal(0, SHORE_Z).z);
  const inland = chunkOf(worldFromLocal(0, 20).x, worldFromLocal(0, 20).z);
  assert.deepEqual(shore, { cx: 19, cz: 15 });
  assert.deepEqual(inland, { cx: 19, cz: 16 });
});
