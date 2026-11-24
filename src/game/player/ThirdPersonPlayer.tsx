"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { FOUNDATION } from "@/game/config/foundation";
import { consumePressed, movementInput, type KeyState } from "@/game/input/useKeyState";
import type { LookState } from "@/game/input/usePointerLock";
import type { MotionSample } from "@/game/player/locomotion";
import { approachVelocity, dampAngle, wishDirection, stepVerticalVelocity, yawToward } from "@/game/player/movement";
import { HumanAvatar } from "@/game/player/HumanAvatar";
import type { PlayerPose } from "@/game/player/pose";

interface ThirdPersonPlayerProps {
  bodyRef: RefObject<RapierRigidBody | null>;
  look: RefObject<LookState | null>;
  keys: RefObject<KeyState | null>;
  /** While a mission panel or the map is open, gravity stays and walking stops. */
  haltRef?: RefObject<boolean>;
  pose: RefObject<PlayerPose>;
}

const FIXED_STEP = 1 / 60;

export function ThirdPersonPlayer({ bodyRef, look, keys, haltRef, pose }: ThirdPersonPlayerProps) {
  const { world } = useRapier();
  const colliderRef = useRef<RapierCollider>(null);
  const visualRef = useRef<Group>(null);
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const vy = useRef(0);
  const grounded = useRef(true);
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

    accumulator.current = Math.min(accumulator.current + delta, 0.1);
    const jumpPressed = consumePressed(keyState, "Space");
    let jumpLeft = jumpPressed;
    let steps = 0;
    while (accumulator.current >= FIXED_STEP && steps < 4) {
      accumulator.current -= FIXED_STEP;
      integrate(FIXED_STEP, jumpLeft);
      jumpLeft = false;
      steps += 1;
    }
  });

  function integrate(dt: number, jumpPressed: boolean) {
    const body = bodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    const keyState = keys.current;
    const lookState = look.current;
    if (!body || !collider || !controller || !keyState || !lookState) return;

    const halted = haltRef?.current === true;
    const held = keyState.held;
    const wish = halted ? { x: 0, z: 0 } : wishDirection(lookState.yaw, movementInput(held));
    const moving = wish.x !== 0 || wish.z !== 0;
    const sprint = !halted && (held.has("ShiftLeft") || held.has("ShiftRight"));
    const targetSpeed = !moving || halted ? 0 : sprint ? FOUNDATION.sprintSpeed : FOUNDATION.walkSpeed;
    const rate = moving && !halted ? FOUNDATION.acceleration : FOUNDATION.deceleration;
    velocity.current = halted ? { x: 0, z: 0 } : approachVelocity(velocity.current, wish, targetSpeed, rate, dt);
    const jump = !halted && jumpPressed;
    let vertical = stepVerticalVelocity(vy.current, grounded.current, jump, FOUNDATION.gravity, dt, FOUNDATION.jumpVelocity);

    if (vertical > 0) controller.disableSnapToGround();
    else controller.enableSnapToGround(FOUNDATION.snapDistance);

    controller.computeColliderMovement(collider, {
      x: velocity.current.x * dt,
      y: vertical * dt,
      z: velocity.current.z * dt,
    });
    const corrected = controller.computedMovement();
    const pos = body.translation();
    const next = {
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    };
    body.setNextKinematicTranslation(next);

    const onGround = controller.computedGrounded();
    grounded.current = onGround;
    if (onGround && vertical < 0) vertical = 0;
    if (vertical > 0 && corrected.y < vertical * dt * 0.5) vertical = 0;
    vy.current = vertical;

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
    motion.current = { speed, vertical, grounded: onGround, sprinting: sprint && moving };
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
