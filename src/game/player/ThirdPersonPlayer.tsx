"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { FOUNDATION } from "@/game/config/foundation";
import { consumePressed, movementInput, type KeyState } from "@/game/input/useKeyState";
import type { LookState } from "@/game/input/usePointerLock";
import { approachVelocity, dampAngle, wishDirection, stepVerticalVelocity, yawToward } from "@/game/player/movement";

interface ThirdPersonPlayerProps {
  bodyRef: RefObject<RapierRigidBody | null>;
  look: RefObject<LookState | null>;
  keys: RefObject<KeyState | null>;
  /** While a mission panel is open, gravity stays and walking stops. */
  haltRef?: RefObject<boolean>;
}

export function ThirdPersonPlayer({ bodyRef, look, keys, haltRef }: ThirdPersonPlayerProps) {
  const { world } = useRapier();
  const colliderRef = useRef<RapierCollider>(null);
  const visualRef = useRef<Group>(null);
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const vy = useRef(0);
  const grounded = useRef(false);
  const velocity = useRef({ x: 0, z: 0 });

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

    const dt = Math.min(delta, 1 / 30);
    const halted = haltRef?.current === true;
    const held = keyState.held;
    const wish = halted ? { x: 0, z: 0 } : wishDirection(lookState.yaw, movementInput(held));
    const moving = wish.x !== 0 || wish.z !== 0;
    const sprint = held.has("ShiftLeft") || held.has("ShiftRight");
    const targetSpeed = !moving || halted ? 0 : sprint ? FOUNDATION.sprintSpeed : FOUNDATION.walkSpeed;
    const rate = moving && !halted ? FOUNDATION.acceleration : FOUNDATION.deceleration;
    velocity.current = halted
      ? { x: 0, z: 0 }
      : approachVelocity(velocity.current, wish, targetSpeed, rate, dt);
    const jumpPressed = consumePressed(keyState, "Space");
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
    body.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    });

    const onGround = controller.computedGrounded();
    grounded.current = onGround;
    if (onGround && vertical < 0) vertical = 0;
    if (vertical > 0 && corrected.y < vertical * dt * 0.5) vertical = 0;
    vy.current = vertical;

    const visual = visualRef.current;
    const travel = Math.hypot(velocity.current.x, velocity.current.z);
    if (visual && travel > 0.35) {
      visual.rotation.y = dampAngle(
        visual.rotation.y,
        yawToward(velocity.current.x, velocity.current.z),
        FOUNDATION.turnSharpness,
        dt,
      );
    }
  });

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
      <group ref={visualRef}>
        <mesh castShadow position={[0, 0, 0]}>
          <capsuleGeometry args={[FOUNDATION.capsuleRadius, FOUNDATION.capsuleHalf * 2, 6, 12]} />
          <meshStandardMaterial color="#e7a25a" roughness={0.48} metalness={0.04} />
        </mesh>
        <mesh castShadow position={[0, 0.28, FOUNDATION.capsuleRadius * 0.72]}>
          <boxGeometry args={[0.24, 0.08, 0.08]} />
          <meshStandardMaterial color="#1c232c" roughness={0.4} />
        </mesh>
      </group>
    </RigidBody>
  );
}
