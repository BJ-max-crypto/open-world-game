"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useGLTF } from "@react-three/drei";
import type { Group, Mesh, Object3D } from "three";
import { consumePressed, movementInput, type KeyState } from "@/game/input/useKeyState";
import type { PlayerPose } from "@/game/player/pose";
import type { CityLifeState } from "@/game/world/life/simulate";
import {
  KAYAK_DOCK,
  KAYAK_SCALE,
  canBoard,
  canStepOff,
  createKayak,
  dockStand,
  kayakSeat,
  kayakSurface,
  stepKayak,
  type BoatSample,
  type KayakSeat,
} from "@/game/world/life/kayak";
import { waveHeight } from "@/game/world/life/routes";

const MODEL = "/models/vehicles/kayak.glb";

interface KayakRigProps {
  keys: RefObject<KeyState | null>;
  pose: RefObject<PlayerPose>;
  bodyRef: RefObject<RapierRigidBody | null>;
  haltRef: RefObject<boolean>;
  paddleRef: RefObject<boolean>;
  seatRef: RefObject<KayakSeat | null>;
  dismountRef: RefObject<{ x: number; y: number; z: number } | null>;
  markRef: RefObject<{ x: number; z: number } | null>;
  life: RefObject<CityLifeState>;
  onPrompt: (label: string | null) => void;
}

export function KayakRig(props: KayakRigProps) {
  return (
    <group>
      <Dock />
      <Kayak {...props} />
    </group>
  );
}

function Dock() {
  const deckY = 0.16;
  return (
    <RigidBody type="fixed" position={[KAYAK_DOCK.x, deckY, KAYAK_DOCK.z]} colliders={false} friction={1}>
      <CuboidCollider args={[KAYAK_DOCK.w / 2, 0.16, KAYAK_DOCK.d / 2]} />
      <mesh receiveShadow castShadow>
        <boxGeometry args={[KAYAK_DOCK.w, 0.22, KAYAK_DOCK.d]} />
        <meshStandardMaterial color="#8d6a45" roughness={0.82} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}-${sz}`} position={[(sx * KAYAK_DOCK.w) / 2, 0.15, (sz * KAYAK_DOCK.d) / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 1.1, 6]} />
          <meshStandardMaterial color="#5c4634" roughness={0.8} />
        </mesh>
      ))}
    </RigidBody>
  );
}

function Kayak({
  keys,
  pose,
  bodyRef,
  haltRef,
  paddleRef,
  seatRef,
  dismountRef,
  markRef,
  life,
  onPrompt,
}: KayakRigProps) {
  const gltf = useGLTF(MODEL);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const group = useRef<Group>(null);
  const state = useRef(createKayak());
  const shown = useRef<string | null>(null);

  useMemo(() => {
    scene.traverse((node: Object3D) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [scene]);

  useFrame((_, delta) => {
    const keyState = keys.current;
    const focus = pose.current;
    const node = group.current;
    if (!keyState || !focus || !node) return;
    const dt = Math.min(delta, 0.05);
    const halted = haltRef.current === true;
    const boats = samples(life.current);
    let kayak = state.current;
    const wantsInteract = kayak.occupied || canBoard(focus.x, focus.z, kayak);
    const pressed = !halted && wantsInteract && consumePressed(keyState, "KeyE");

    if (!kayak.occupied && pressed && canBoard(focus.x, focus.z, kayak)) {
      kayak = { ...kayak, occupied: true, speed: 0 };
    } else if (kayak.occupied && pressed && canStepOff(kayak)) {
      kayak = { ...kayak, occupied: false, speed: 0 };
      dismountRef.current = dockStand();
      paddleRef.current = false;
    } else if (kayak.occupied && pressed) {
      // Stay aboard. E was consumed so a mission prompt cannot fire on the water.
    }

    if (kayak.occupied && !halted) {
      const move = movementInput(keyState.held);
      const sprint = keyState.held.has("ShiftLeft") || keyState.held.has("ShiftRight");
      kayak = stepKayak(kayak, { ...move, sprint }, dt, boats);
    } else if (kayak.occupied) {
      kayak = { ...kayak, speed: 0 };
    }

    state.current = kayak;
    paddleRef.current = kayak.occupied;
    const time = life.current?.time ?? 0;
    seatRef.current = kayak.occupied ? kayakSeat(kayak, time) : null;
    markRef.current = { x: kayak.x, z: kayak.z };

    const label = labelFor(kayak, focus.x, focus.z);
    if (label !== shown.current) {
      shown.current = label;
      onPrompt(label);
    }

    const y = kayakSurface(kayak.x, kayak.z, time);
    const slope = 0.45;
    const ahead = waveHeight(kayak.x + Math.sin(kayak.yaw) * slope, kayak.z + Math.cos(kayak.yaw) * slope, time);
    const behind = waveHeight(kayak.x - Math.sin(kayak.yaw) * slope, kayak.z - Math.cos(kayak.yaw) * slope, time);
    const right = waveHeight(kayak.x + Math.cos(kayak.yaw) * slope, kayak.z - Math.sin(kayak.yaw) * slope, time);
    const left = waveHeight(kayak.x - Math.cos(kayak.yaw) * slope, kayak.z + Math.sin(kayak.yaw) * slope, time);
    const pitch = Math.max(-0.1, Math.min(0.1, -Math.atan2(ahead - behind, slope * 2)));
    const roll = Math.max(-0.08, Math.min(0.08, Math.atan2(right - left, slope * 2)));
    node.rotation.order = "YXZ";
    node.rotation.set(pitch, kayak.yaw, roll);
    node.position.set(kayak.x, y, kayak.z);
  });

  return (
    <group ref={group} scale={KAYAK_SCALE}>
      <primitive object={scene} />
    </group>
  );
}

function labelFor(kayak: ReturnType<typeof createKayak>, x: number, z: number): string | null {
  if (kayak.occupied) return canStepOff(kayak) ? "Step onto the dock" : "Paddle back to the dock";
  return canBoard(x, z, kayak) ? "Board the kayak" : null;
}

function samples(life: CityLifeState | null): BoatSample[] {
  if (!life) return [];
  return life.boats.map((boat) => ({
    x: boat.x,
    z: boat.z,
    radius: boat.kind === "ferry" ? 5.5 : boat.kind === "sail" ? 3.2 : 2.4,
  }));
}

useGLTF.preload(MODEL);
