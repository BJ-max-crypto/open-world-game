"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { LoopOnce, LoopRepeat, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { KeyState } from "@/game/input/useKeyState";
import type { PlayerPose } from "@/game/player/pose";
import { KayakRig } from "@/game/world/life/Kayak";
import type { KayakSeat } from "@/game/world/life/kayak";
import { PEOPLE, type PersonClip } from "@/game/world/life/people";
import { LANES, lanePose } from "@/game/world/life/routes";
import { createLife, stepLife, type CityLifeState, type VehicleKind } from "@/game/world/life/simulate";

const NEAR = 58;

interface CityLifeProps {
  pose: RefObject<PlayerPose>;
  keys: RefObject<KeyState | null>;
  bodyRef: RefObject<RapierRigidBody | null>;
  haltRef: RefObject<boolean>;
  paddleRef: RefObject<boolean>;
  seatRef: RefObject<KayakSeat | null>;
  dismountRef: RefObject<{ x: number; y: number; z: number } | null>;
  markRef: RefObject<{ x: number; z: number } | null>;
  onKayakPrompt: (label: string | null) => void;
}

export function CityLife({
  pose,
  keys,
  bodyRef,
  haltRef,
  paddleRef,
  seatRef,
  dismountRef,
  markRef,
  onKayakPrompt,
}: CityLifeProps) {
  const life = useRef<CityLifeState>(createLife());
  useFrame((_, delta) => {
    const focus = pose.current;
    if (focus && Math.hypot(focus.x, focus.z) > 400) return;
    stepLife(life.current, delta);
  });

  return (
    <group>
      {life.current.peds.map((ped) => (
        <Person key={ped.id} index={ped.id} url={PEOPLE[ped.person]} life={life} pose={pose} />
      ))}
      {life.current.cars.map((car) => (
        <Car key={car.id} index={car.id} life={life} pose={pose} />
      ))}
      {life.current.boats.map((boat) => (
        <Boat key={boat.id} index={boat.id} life={life} pose={pose} />
      ))}
      <KayakRig
        keys={keys}
        pose={pose}
        bodyRef={bodyRef}
        haltRef={haltRef}
        paddleRef={paddleRef}
        seatRef={seatRef}
        dismountRef={dismountRef}
        markRef={markRef}
        life={life}
        onPrompt={onKayakPrompt}
      />
    </group>
  );
}

function soften(scene: Object3D): void {
  scene.traverse((node: Object3D) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.frustumCulled = true;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (!material || !("metalness" in material)) continue;
      const standard = material as MeshStandardMaterial;
      standard.metalness = Math.min(standard.metalness, 0.12);
      standard.roughness = Math.max(standard.roughness, 0.58);
    }
  });
}

function clipFor(mode: string, pace: number, bench: boolean): PersonClip {
  if (mode === "walk") return pace > 1.65 ? "Run" : "Walk";
  if (bench && mode === "wait") return "SitDown";
  return "Idle";
}

function Person({
  index,
  url,
  life,
  pose,
}: {
  index: number;
  url: string;
  life: RefObject<CityLifeState>;
  pose: RefObject<PlayerPose>;
}) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => cloneSkeleton(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, scene);
  const playing = useRef<PersonClip>("Idle");
  const group = useRef<Group>(null);

  useEffect(() => {
    soften(scene);
    const idle = actions.Idle;
    idle?.reset().fadeIn(0.1).play();
  }, [actions, scene]);

  useFrame(() => {
    const ped = life.current?.peds[index];
    const node = group.current;
    const focus = pose.current;
    if (!ped || !node || !focus) return;
    const away = Math.hypot(ped.x - focus.x, ped.z - focus.z);
    node.visible = ped.mode !== "inside" && away < NEAR;
    node.position.set(ped.x, 0, ped.z);
    node.rotation.y = ped.yaw;
    if (!node.visible) return;
    const wanted = clipFor(ped.mode, ped.pace, ped.bench);
    const next = wanted === "Run" && !actions.Run ? "Walk" : wanted;
    if (playing.current !== next) {
      actions[playing.current]?.fadeOut(0.18);
      const action = actions[next];
      if (action) {
        action.reset();
        if (next === "SitDown") {
          action.setLoop(LoopOnce, 1);
          action.clampWhenFinished = true;
        } else {
          action.setLoop(LoopRepeat, Infinity);
        }
        action.fadeIn(0.18).play();
      }
      playing.current = next;
    }
    const action = actions[playing.current];
    if (action && (playing.current === "Walk" || playing.current === "Run")) {
      action.timeScale = Math.min(1.35, Math.max(0.75, ped.pace / 1.35));
    }
    const arm = scene.getObjectByName("CharacterArmature");
    if (arm) {
      arm.position.x = 0;
      arm.position.z = 0;
    }
  });

  return (
    <group ref={group} scale={0.55}>
      <primitive object={scene} />
    </group>
  );
}

function Car({
  index,
  life,
  pose,
}: {
  index: number;
  life: RefObject<CityLifeState>;
  pose: RefObject<PlayerPose>;
}) {
  const body = useRef<RapierRigidBody>(null);
  const wheels = useRef<Group>(null);
  const driver = useRef<Group>(null);
  const initial = lanePose(LANES[index], life.current?.cars[index]?.distance ?? 0);
  const gltf = useGLTF(PEOPLE[life.current?.cars[index]?.driver ?? 0]);
  const driverScene = useMemo(() => {
    const copy = cloneSkeleton(gltf.scene);
    soften(copy);
    return copy;
  }, [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, driverScene);

  useEffect(() => {
    const sit = actions.SitDown;
    if (!sit) return;
    sit.reset();
    sit.setLoop(LoopOnce, 1);
    sit.clampWhenFinished = true;
    sit.play();
    sit.time = Math.max(0, sit.getClip().duration - 0.04);
  }, [actions]);

  useFrame(() => {
    const car = life.current?.cars[index];
    const focus = pose.current;
    if (!car || !focus || !body.current) return;
    const at = lanePose(LANES[car.lane], car.distance);
    const away = Math.hypot(at.x - focus.x, at.z - focus.z);
    body.current.setNextKinematicTranslation({ x: at.x, y: 0.68, z: at.z });
    const half = yawHalf(at.yaw);
    body.current.setNextKinematicRotation({ x: 0, y: half.y, z: 0, w: half.w });
    wheels.current?.children.forEach((wheel) => {
      wheel.rotation.x = car.distance * 1.4;
    });
    if (driver.current) driver.current.visible = away < NEAR;
  });

  const car = life.current?.cars[index];
  if (!car) return null;
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[initial.x, 0.68, initial.z]}
      rotation={[0, initial.yaw, 0]}
    >
      <CuboidCollider args={[0.9, 0.62, 2.15]} />
      <VehicleBody kind={car.kind} color={car.color} wheels={wheels} />
      <group ref={driver} position={[0.28, 0.15, 0.35]} scale={0.42}>
        <primitive object={driverScene} />
      </group>
    </RigidBody>
  );
}

function yawHalf(yaw: number): { y: number; w: number } {
  return { y: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };
}

function VehicleBody({
  kind,
  color,
  wheels,
}: {
  kind: VehicleKind;
  color: string;
  wheels: RefObject<Group | null>;
}) {
  const spec = SPECS[kind];
  return (
    <group>
      <mesh castShadow position={[0, spec.bodyY, 0]}>
        <boxGeometry args={[spec.width, spec.bodyH, spec.length]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.35} />
      </mesh>
      <mesh position={[0, spec.cabY, spec.cabZ]} castShadow>
        <boxGeometry args={[spec.width * 0.86, spec.cabH, spec.cabD]} />
        <meshStandardMaterial color="#9eb0bc" roughness={0.08} metalness={0.15} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.42, spec.length / 2]}>
        <boxGeometry args={[spec.width * 0.7, 0.12, 0.08]} />
        <meshStandardMaterial color="#f4efe4" emissive="#f4efe4" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.42, -spec.length / 2]}>
        <boxGeometry args={[spec.width * 0.62, 0.1, 0.06]} />
        <meshStandardMaterial color="#8c1f1a" emissive="#8c1f1a" emissiveIntensity={0.55} />
      </mesh>
      <group ref={wheels}>
        {[
          [-spec.width / 2 - 0.02, spec.length * 0.32],
          [spec.width / 2 + 0.02, spec.length * 0.32],
          [-spec.width / 2 - 0.02, -spec.length * 0.32],
          [spec.width / 2 + 0.02, -spec.length * 0.32],
        ].map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.02, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.18, 12]} />
            <meshStandardMaterial color="#1a1d20" roughness={0.7} metalness={0.2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const SPECS: Record<VehicleKind, { width: number; length: number; bodyH: number; bodyY: number; cabY: number; cabZ: number; cabH: number; cabD: number }> = {
  sedan: { width: 1.75, length: 4.4, bodyH: 0.72, bodyY: 0.18, cabY: 0.62, cabZ: -0.1, cabH: 0.62, cabD: 2.1 },
  suv: { width: 1.9, length: 4.7, bodyH: 0.95, bodyY: 0.28, cabY: 0.85, cabZ: 0.05, cabH: 0.78, cabD: 2.5 },
  van: { width: 1.95, length: 5.1, bodyH: 1.35, bodyY: 0.42, cabY: 0.95, cabZ: 1.15, cabH: 0.7, cabD: 1.3 },
  truck: { width: 2.05, length: 6.2, bodyH: 0.85, bodyY: 0.32, cabY: 1.05, cabZ: 1.7, cabH: 1.15, cabD: 1.6 },
};

function Boat({
  index,
  life,
  pose,
}: {
  index: number;
  life: RefObject<CityLifeState>;
  pose: RefObject<PlayerPose>;
}) {
  const kind = life.current?.boats[index]?.kind ?? "skiff";
  const url = kind === "skiff" ? "/models/vehicles/skiff.glb" : kind === "sail" ? "/models/vehicles/sailboat.glb" : "/models/vehicles/ferry.glb";
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const group = useRef<Group>(null);
  const scale = kind === "ferry" ? 0.55 : kind === "sail" ? 7 : 9;

  useFrame(({ clock }) => {
    const boat = life.current?.boats[index];
    const node = group.current;
    const focus = pose.current;
    if (!boat || !node || !focus) return;
    node.visible = Math.hypot(boat.x - focus.x, boat.z - focus.z) < 90;
    const roll = Math.sin(clock.elapsedTime * 0.8 + index) * 0.06;
    node.position.set(boat.x, boat.y, boat.z);
    node.rotation.set(roll, boat.yaw, 0);
  });

  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

for (const url of PEOPLE) useGLTF.preload(url);
useGLTF.preload("/models/vehicles/skiff.glb");
useGLTF.preload("/models/vehicles/sailboat.glb");
useGLTF.preload("/models/vehicles/ferry.glb");
