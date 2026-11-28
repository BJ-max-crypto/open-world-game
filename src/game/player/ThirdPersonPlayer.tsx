"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { FOUNDATION } from "@/game/config/foundation";
import { consumePressed, movementInput, takeSpaceGesture, type KeyState } from "@/game/input/useKeyState";
import type { LookState } from "@/game/input/usePointerLock";
import type { MotionSample } from "@/game/player/locomotion";
import { approachVelocity, dampAngle, wishDirection, stepFlight, yawToward, type Flight } from "@/game/player/movement";
import { HumanAvatar } from "@/game/player/HumanAvatar";
import type { PlayerPose } from "@/game/player/pose";
import type { KayakSeat } from "@/game/world/life/kayak";

interface ThirdPersonPlayerProps {
  bodyRef: RefObject<RapierRigidBody | null>;
  look: RefObject<LookState | null>;
  keys: RefObject<KeyState | null>;
  /** While a mission panel or the map is open, gravity stays and walking stops. */
  haltRef?: RefObject<boolean>;
  paddleRef?: RefObject<boolean>;
  seatRef?: RefObject<KayakSeat | null>;
  dismountRef?: RefObject<{ x: number; y: number; z: number } | null>;
  pose: RefObject<PlayerPose>;
}

const FIXED_STEP = 1 / 60;

export function ThirdPersonPlayer({ bodyRef, look, keys, haltRef, paddleRef, seatRef, dismountRef, pose }: ThirdPersonPlayerProps) {
  const { world } = useRapier();
  const colliderRef = useRef<RapierCollider>(null);
  const visualRef = useRef<Group>(null);
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const vy = useRef(0);
  const grounded = useRef(true);
  const flight = useRef<Flight>("ground");
  const suppressRise = useRef(false);
  const lastSpaceTap = useRef(0);
  const place = useRef({ x: 0, y: 0, z: 0 });
  const velocity = useRef({ x: 0, z: 0 });
  const accumulator = useRef(0);
  const motion = useRef<MotionSample>({ speed: 0, vertical: 0, grounded: true, sprinting: false });

  useEffect(() => {
    const controller = world.createCharacterController(FOUNDATION.skin);
    controller.enableAutostep(FOUNDATION.autostepHeight, FOUNDATION.autostepMinWidth, true);
    controller.enableSnapToGround(FOUNDATION.snapDistance);
    controller.setMaxSlopeClimbAngle(FOUNDATION.maxSlope);
    controller.setMinSlopeSlideAngle(FOUNDATION.minSlide);
    controller.setSlideEnabled(true);
    controller.setApplyImpulsesToDynamicBodies(true);
    controllerRef.current = controller;
    return () => {
      world.removeCharacterController(controller);
      controllerRef.current = null;
    };
  }, [world]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    const keyState = keys.current;
    const lookState = look.current;
    if (!body || !collider || !controller || !keyState || !lookState) return;

    // Catch up after a hitch. Sixty frames a second still takes a single step.
    accumulator.current = Math.min(accumulator.current + delta, 0.25);
    consumePressed(keyState, "Space");
    const taps = keyState.spaceTaps.splice(0, keyState.spaceTaps.length);
    const gesture = takeSpaceGesture(taps, lastSpaceTap.current, 400);
    lastSpaceTap.current = gesture.previousTap;
    const lifted = stepFlight(
      flight.current,
      grounded.current,
      keyState.held.has("Space"),
      gesture.double,
      suppressRise.current,
    );
    flight.current = lifted.flight;
    suppressRise.current = lifted.suppressRise;
    const origin = body.translation();
    place.current.x = origin.x;
    place.current.y = origin.y;
    place.current.z = origin.z;
    let steps = 0;
    while (accumulator.current >= FIXED_STEP && steps < 12) {
      accumulator.current -= FIXED_STEP;
      integrate(FIXED_STEP, 0, 0, false);
      steps += 1;
    }
    // Small steps the controller will accept, enough of them to match the clock.
    const clockDt = Math.min(Math.max(delta, FIXED_STEP), 0.5);
    if (flight.current === "rise") {
      let left = FOUNDATION.liftSpeed * clockDt;
      const bit = FOUNDATION.liftSpeed * FIXED_STEP;
      let n = 0;
      while (left > 0.01 && n < 40 && flight.current === "rise") {
        const climb = Math.min(left, bit);
        integrate(FIXED_STEP, climb, 0, true);
        left -= climb;
        n += 1;
      }
    } else if (flight.current === "fall") {
      let left = clockDt;
      let n = 0;
      while (left > 0.001 && n < 40 && flight.current === "fall") {
        const drop = Math.min(left, FIXED_STEP);
        integrate(FIXED_STEP, 0, drop, true);
        left -= drop;
        n += 1;
      }
    }
  });

  function integrate(dt: number, climb = 0, dropDt = 0, verticalOnly = false) {
    const body = bodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    const keyState = keys.current;
    const lookState = look.current;
    if (!body || !collider || !controller || !keyState || !lookState) return;

    const spot = dismountRef?.current;
    if (spot) {
      dismountRef.current = null;
      body.setTranslation(spot, true);
      body.setNextKinematicTranslation(spot);
      velocity.current = { x: 0, z: 0 };
      vy.current = 0;
      grounded.current = true;
      flight.current = "ground";
      suppressRise.current = false;
      motion.current = { speed: 0, vertical: 0, grounded: true, sprinting: false };
      pose.current = { x: spot.x, z: spot.z, yaw: pose.current.yaw, speed: 0 };
      return;
    }
    const seat = paddleRef?.current ? seatRef?.current : null;
    if (seat) {
      const at = { x: seat.x, y: seat.y, z: seat.z };
      body.setTranslation(at, true);
      body.setNextKinematicTranslation(at);
      velocity.current = { x: 0, z: 0 };
      vy.current = 0;
      grounded.current = true;
      flight.current = "ground";
      suppressRise.current = false;
      const visual = visualRef.current;
      if (visual) visual.rotation.y = seat.yaw;
      motion.current = { speed: 0, vertical: 0, grounded: true, sprinting: false };
      pose.current = { x: seat.x, z: seat.z, yaw: seat.yaw, speed: seat.speed };
      return;
    }

    const halted = haltRef?.current === true;
    const held = keyState.held;
    const wish = halted ? { x: 0, z: 0 } : wishDirection(lookState.yaw, movementInput(held));
    const moving = wish.x !== 0 || wish.z !== 0;
    const sprint = !halted && (held.has("ShiftLeft") || held.has("ShiftRight"));
    const targetSpeed = !moving || halted ? 0 : sprint ? FOUNDATION.sprintSpeed : FOUNDATION.walkSpeed;
    const rate = moving && !halted ? FOUNDATION.acceleration : FOUNDATION.deceleration;
    velocity.current = halted ? { x: 0, z: 0 } : approachVelocity(velocity.current, wish, targetSpeed, rate, dt);
    let vertical = 0;
    let nextVy = 0;
    if (flight.current === "fall" && dropDt > 0) {
      nextVy = vy.current + FOUNDATION.gravity * dropDt;
      vertical = (((vy.current + nextVy) * 0.5) * dropDt) / dt;
    } else if (flight.current === "rise" && !halted && climb > 0) {
      nextVy = FOUNDATION.liftSpeed;
      vertical = climb / dt;
    }

    if (flight.current === "rise" || flight.current === "hover") controller.disableSnapToGround();
    else controller.enableSnapToGround(FOUNDATION.snapDistance);

    controller.computeColliderMovement(collider, {
      x: verticalOnly ? 0 : velocity.current.x * dt,
      y: vertical * dt,
      z: verticalOnly ? 0 : velocity.current.z * dt,
    });
    const corrected = controller.computedMovement();
    const pos = place.current;
    const next = {
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    };
    pos.x = next.x;
    pos.y = next.y;
    pos.z = next.z;
    body.setNextKinematicTranslation(next);

    const onGround = controller.computedGrounded();
    const feet = next.y - (FOUNDATION.capsuleHalf + FOUNDATION.capsuleRadius);
    const landed = onGround || feet < 0.2;
    grounded.current = onGround || (flight.current === "ground" && landed);
    if (landed && flight.current === "fall") {
      flight.current = "ground";
      suppressRise.current = false;
      nextVy = 0;
    }
    if (onGround && nextVy < 0) nextVy = 0;
    if (nextVy > 0 && corrected.y < vertical * dt * 0.5) nextVy = 0;
    vy.current = flight.current === "ground" || flight.current === "hover" ? 0 : nextVy;

    const speed = Math.hypot(velocity.current.x, velocity.current.z);
    const visual = visualRef.current;
    if (visual && speed > 0.2) {
      visual.rotation.y = dampAngle(
        visual.rotation.y,
        yawToward(velocity.current.x, velocity.current.z),
        FOUNDATION.turnSharpness,
        dt,
      );
    }
    motion.current = {
      speed,
      vertical: flight.current === "hover" || flight.current === "ground" ? 0 : nextVy,
      grounded: flight.current === "ground" || flight.current === "hover" || feet < 0.2,
      sprinting: sprint && moving,
    };
    pose.current = {
      x: next.x,
      z: next.z,
      yaw: visual?.rotation.y ?? pose.current.yaw,
      speed,
    };
  }

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={FOUNDATION.spawn}
      colliders={false}
      enabledRotations={[false, false, false]}
      canSleep={false}
    >
      <CapsuleCollider ref={colliderRef} args={[FOUNDATION.capsuleHalf, FOUNDATION.capsuleRadius]} />
      <group ref={visualRef} position={[0, -(FOUNDATION.capsuleHalf + FOUNDATION.capsuleRadius), 0]}>
        <HumanAvatar motion={motion} />
      </group>
    </RigidBody>
  );
}
