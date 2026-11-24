import assert from "node:assert/strict";
import test from "node:test";
import { Economy } from "../src/game/economy/Economy.ts";
import { Inventory, starterItems } from "../src/game/inventory/Inventory.ts";
import { MissionManager } from "../src/game/missions/MissionManager.ts";
import { PropertyManager } from "../src/game/properties/PropertyManager.ts";
import { PROPERTIES } from "../src/game/properties/Property.ts";
import { cleanCallsign } from "../src/services/callsign.ts";
import { sanitizeSave } from "../src/services/saveSchema.ts";

test("cash cannot drop below zero", () => {
  const economy = new Economy(250);
  assert.equal(economy.debit(300, "property"), null);
  assert.equal(economy.cash, 250);
  const paid = economy.debit(200, "property");
  assert.ok(paid);
  assert.equal(economy.cash, 50);
  assert.equal(paid?.balanceAfter, 50);
});

test("the fare pays out once, then the loft can be bought", () => {
  const economy = new Economy(250);
  const missions = new MissionManager();
  assert.equal(missions.update({ x: 0, z: 0, drivingId: null }), 0);
  assert.equal(missions.update({ x: 48, z: -22, drivingId: null }), 0);
  assert.equal(missions.objective, "Get in the cab");
  assert.equal(missions.update({ x: 48, z: -22, drivingId: "cab" }), 0);
  assert.equal(missions.update({ x: -64, z: 64, drivingId: "cab" }), 0);
  const reward = missions.update({ x: -64, z: 64, drivingId: null });
  assert.equal(reward, 500);
  assert.equal(missions.update({ x: 0, z: 0, drivingId: null }), 0);
  economy.credit(reward, "mission");
  const door = PROPERTIES[0];
  const properties = new PropertyManager();
  const bought = properties.tryBuy(door.id, economy, door.doorX, door.doorZ);
  assert.equal(bought.ok, true);
  assert.equal(economy.cash, 150);
  assert.equal(properties.owns("loft"), true);
  assert.equal(properties.tryBuy("yard-office", economy, 36, 49.6).ok, false);
});

test("starter pockets and callsigns", () => {
  const inventory = new Inventory(starterItems());
  assert.equal(inventory.has("phone"), true);
  inventory.add("keys");
  assert.deepEqual(inventory.export().map((item) => item.id), ["phone", "metro", "keys"]);
  assert.equal(cleanCallsign("  Mara   Voss "), "Mara Voss");
  assert.equal(cleanCallsign("a"), null);
  assert.equal(cleanCallsign("bad<script>"), null);
});

test("corrupt saves are rejected", () => {
  assert.equal(sanitizeSave(null), null);
  assert.equal(sanitizeSave({ version: 1, cash: -5 }), null);
  const save = sanitizeSave({
    version: 1,
    updatedAt: "2026-11-24T18:00:00.000Z",
    x: -20,
    y: 0,
    z: -20,
    yaw: 0,
    facing: 0,
    cash: 250,
    stamina: 1,
    missionIndex: 0,
    missionComplete: false,
    inventory: [{ id: "phone", quantity: 1 }],
    ownedPropertyIds: [],
    waypoint: null,
    drivingId: null,
    vehicles: [{ id: "cab", x: 48, z: -22, heading: 0.2, speed: 0 }],
  });
  assert.equal(save?.cash, 250);
  assert.equal(sanitizeSave({ ...save, x: 9999 }), null);
});
