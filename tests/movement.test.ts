import assert from "node:assert/strict";
import test from "node:test";
import { movementInput, takeSpaceGesture } from "../src/game/input/useKeyState.ts";
import {
  approachVelocity,
  cameraOffset,
  dampAngle,
  cameraClearance,
  stepFlight,
  stepVerticalVelocity,
  wishDirection,
  yawToward,
} from "../src/game/player/movement.ts";

test("forward at yaw 0 walks toward -Z and right is +X", () => {
  const forward = wishDirection(0, { forward: true, back: false, left: false, right: false });
  assert.ok(Math.abs(forward.x) < 1e-6);
  assert.ok(forward.z < -0.99);
  const right = wishDirection(0, { forward: false, back: false, left: false, right: true });
  assert.ok(right.x > 0.99);
  assert.ok(Math.abs(right.z) < 1e-6);
});

test("ground speed eases toward the wish and back to a stop", () => {
  const eased = approachVelocity({ x: 0, z: 0 }, { x: 0, z: -1 }, 4.6, 16, 0.1);
  assert.ok(Math.abs(eased.x) < 1e-6);
  assert.ok(Math.abs(eased.z + 1.6) < 1e-6);
  const stopped = approachVelocity(eased, { x: 0, z: 0 }, 0, 28, 0.02);
  assert.ok(stopped.z > eased.z && stopped.z < 0);
  const rest = approachVelocity(eased, { x: 0, z: 0 }, 0, 28, 1);
  assert.equal(rest.x, 0);
  assert.equal(rest.z, 0);
});

test("arrow keys move and letter keys do not", () => {
  const arrows = movementInput({
    has: (code) => code === "ArrowUp" || code === "ArrowLeft",
  });
  assert.deepEqual(arrows, { forward: true, back: false, left: true, right: false });
  const letters = movementInput({
    has: (code) => code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD",
  });
  assert.deepEqual(letters, { forward: false, back: false, left: false, right: false });
});

test("opposite keys cancel and diagonals stay unit length", () => {
  const cancel = wishDirection(0.4, { forward: true, back: true, left: false, right: false });
  assert.equal(cancel.x, 0);
  assert.equal(cancel.z, 0);
  const diagonal = wishDirection(0, { forward: true, back: false, left: false, right: true });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-6);
});

test("holding space climbs, releasing hovers, and a double-tap drops", () => {
  const climbed = stepFlight("ground", true, true, false, false);
  assert.deepEqual(climbed, { flight: "rise", suppressRise: false });
  const hovered = stepFlight("rise", false, false, false, false);
  assert.deepEqual(hovered, { flight: "hover", suppressRise: false });
  const dropped = stepFlight("hover", false, true, true, false);
  assert.deepEqual(dropped, { flight: "fall", suppressRise: true });
  const stillDropping = stepFlight("fall", false, true, false, true);
  assert.deepEqual(stillDropping, { flight: "fall", suppressRise: true });
  const falling = stepFlight("fall", false, false, false, false);
  assert.deepEqual(falling, { flight: "fall", suppressRise: false });
  const landed = stepFlight("fall", true, false, false, false);
  assert.deepEqual(landed, { flight: "ground", suppressRise: false });
  const groundedDouble = stepFlight("ground", true, false, true, false);
  assert.deepEqual(groundedDouble, { flight: "ground", suppressRise: false });
  const ledge = stepFlight("ground", false, false, false, false);
  assert.equal(ledge.flight, "fall");
});

test("two space taps inside the window are a double-tap across frames", () => {
  const first = takeSpaceGesture([1000], 0, 400);
  assert.equal(first.double, false);
  const second = takeSpaceGesture([1300], first.previousTap, 400);
  assert.equal(second.double, true);
  const late = takeSpaceGesture([2000], second.previousTap, 400);
  assert.equal(late.double, false);
  const sameFrame = takeSpaceGesture([3000, 3200], 0, 400);
  assert.equal(sameFrame.double, true);
});

test("jump only leaves the ground, and gravity pulls while airborne", () => {
  assert.equal(stepVerticalVelocity(-2, true, false, -22, 0.016, 6), 0);
  assert.equal(stepVerticalVelocity(0, true, true, -22, 0.016, 6), 6);
  assert.ok(stepVerticalVelocity(6, false, true, -22, 0.1, 6) < 6);
  assert.equal(stepVerticalVelocity(0, false, true, -22, 0.016, 6), -22 * 0.016);
});

test("the camera stops short of a wall instead of crossing it", () => {
  const open = cameraClearance(5.6, null, 0.4, 0.28, 0.9);
  assert.deepEqual(open, { origin: "eye", along: 5.6 });
  const far = cameraClearance(6.2, 3.4, 0.4, 0.28, 0.9);
  assert.equal(far.origin, "eye");
  assert.ok(Math.abs(far.along - 2.72) < 1e-6);
  const close = cameraClearance(6.2, 0.7, 0.4, 0.28, 0.9);
  assert.equal(close.origin, "shifted");
  assert.ok(close.along < 0.7);
  assert.ok(close.along > 0);
});

test("facing yaw points +Z along the wish and damping takes the short turn", () => {
  assert.ok(Math.abs(yawToward(0, -1) - Math.PI) < 1e-6 || Math.abs(yawToward(0, -1) + Math.PI) < 1e-6);
  const turned = dampAngle(0.1, Math.PI * 2 - 0.1, 100, 1);
  assert.ok(turned < 0.1);
  const offset = cameraOffset(0, 0, 4);
  assert.ok(Math.abs(offset.x) < 1e-6);
  assert.ok(offset.z > 3.9);
});
