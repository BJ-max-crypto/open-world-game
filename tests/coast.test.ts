import assert from "node:assert/strict";
import test from "node:test";
import { nearestInteractable } from "../src/game/interaction/nearest.ts";
import {
  PACKAGE_IDS,
  acceptDelivery,
  collectPackage,
  createDelivery,
  turnInDelivery,
} from "../src/game/missions/firstOpportunity.ts";
import { CoastSession } from "../src/game/session/CoastSession.ts";
import { sanitizeCoastSave } from "../src/game/session/coastSave.ts";
import {
  CONTACT,
  PACKAGES,
  ROADS,
  SOLIDS,
  SPAWN,
  centerOnRoad,
  footprintsOverlap,
  pointInside,
} from "../src/game/world/coast/layout.ts";

test("buildings stay off the roads and out of each other", () => {
  const blocks = SOLIDS.filter((solid) => solid.kind === "building" || solid.kind === "trunk" || solid.kind === "pole" || solid.kind === "person" || solid.kind === "crate");
  for (const block of blocks) {
    for (const road of ROADS) {
      assert.equal(footprintsOverlap(block, road, 0.15), false, `${block.id} meets ${road.id}`);
    }
  }
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      assert.equal(footprintsOverlap(blocks[i], blocks[j], 0.05), false, `${blocks[i].id} overlaps ${blocks[j].id}`);
    }
  }
  for (const car of SOLIDS.filter((solid) => solid.kind === "vehicle")) {
    assert.equal(centerOnRoad(car), true, car.id);
    for (const block of blocks) {
      assert.equal(footprintsOverlap(car, block, 0.2), false, `${car.id} hits ${block.id}`);
    }
  }
});

test("spawn, contact, and package approaches are walkable", () => {
  const approaches = [
    SPAWN,
    { x: CONTACT.x + 1.3, z: CONTACT.z },
    { x: 0, z: 2 },
    { x: 0, z: 20 },
    ...PACKAGES.map((pkg) => ({ x: pkg.x, z: pkg.z - 1.5 })),
  ];
  for (const point of approaches) {
    const hit = SOLIDS.find((solid) => pointInside(solid, point.x, point.z, 0.4));
    assert.equal(hit, undefined, `${point.x},${point.z} hits ${hit?.id}`);
  }
});

test("the delivery pays $500 once and only in order", () => {
  const session = new CoastSession(null);
  assert.equal(session.snapshot().cash, 250);
  assert.equal(session.tick(PACKAGES[0].x, PACKAGES[0].z, true), "none");
  assert.equal(session.snapshot().collected, 0);

  assert.equal(session.tick(CONTACT.x, CONTACT.z, true), "view");
  assert.equal(session.snapshot().panel, "offer");
  assert.equal(session.accept(), true);
  assert.equal(session.accept(), false);
  assert.equal(session.snapshot().cash, 250);
  assert.equal(session.snapshot().status, "active");
  assert.ok(session.snapshot().waypoint);

  session.dismiss();
  assert.equal(session.tick(CONTACT.x, CONTACT.z, true), "view");
  assert.equal(session.snapshot().panel, "reminder");
  assert.equal(session.snapshot().cash, 250);
  session.dismiss();

  for (const pkg of PACKAGES) {
    const kind = session.tick(pkg.x, pkg.z, true);
    assert.equal(kind, "save");
  }
  assert.equal(session.snapshot().collected, 3);
  assert.equal(session.tick(PACKAGES[0].x, PACKAGES[0].z, true), "none");

  assert.equal(session.tick(CONTACT.x, CONTACT.z, true), "save");
  const done = session.snapshot();
  assert.equal(done.cash, 750);
  assert.equal(done.status, "complete");
  assert.equal(done.panel, "complete");
  assert.equal(done.notice, "Received $500");
  assert.equal(done.waypoint, null);

  session.dismiss();
  assert.equal(session.tick(CONTACT.x, CONTACT.z, true), "view");
  assert.equal(session.snapshot().cash, 750);

  const restored = new CoastSession(sanitizeCoastSave(session.toSave()));
  restored.tick(CONTACT.x, CONTACT.z, true);
  assert.equal(restored.snapshot().cash, 750);
  assert.equal(restored.snapshot().status, "complete");
});

test("mission helpers reject skipped and repeated steps", () => {
  let state = createDelivery();
  assert.equal(collectPackage(state, PACKAGE_IDS[0]), state);
  assert.equal(turnInDelivery(state).reward, 0);
  state = acceptDelivery(state);
  state = collectPackage(state, PACKAGE_IDS[0]);
  state = collectPackage(state, PACKAGE_IDS[0]);
  assert.equal(state.collected.length, 1);
  assert.equal(turnInDelivery(state).reward, 0);
  assert.equal(collectPackage(state, "not-a-package"), state);
});

test("corrupt coast saves are rejected", () => {
  assert.equal(sanitizeCoastSave(null), null);
  assert.equal(sanitizeCoastSave({ version: 1, cash: 250.5, status: "available", packages: [] }), null);
  assert.equal(sanitizeCoastSave({ version: 1, cash: 250, status: "available", packages: ["pkg-a"] }), null);
  assert.equal(sanitizeCoastSave({ version: 1, cash: 750, status: "complete", packages: ["pkg-a"] }), null);
  assert.equal(
    sanitizeCoastSave({ version: 1, cash: -1, status: "active", packages: [] }),
    null,
  );
  const save = sanitizeCoastSave({ version: 1, cash: 750, status: "complete", packages: ["pkg-a", "pkg-b", "pkg-c"] });
  assert.equal(save?.cash, 750);
});

test("the nearest prompt sticks until you step away", () => {
  const near = [{ id: "near", x: 0, z: 0, radius: 2, label: "Near" }];
  assert.equal(nearestInteractable(1.8, 0, near, null)?.id, "near");
  assert.equal(nearestInteractable(2.3, 0, near, null), null);
  assert.equal(nearestInteractable(2.3, 0, near, "near")?.id, "near");
  assert.equal(nearestInteractable(2.6, 0, near, "near"), null);
});
