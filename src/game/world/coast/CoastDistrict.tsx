"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CanvasTexture, DoubleSide, type Group } from "three";
import { SOLIDS, type Solid } from "@/game/world/coast/layout";

interface CoastDistrictProps {
  collectedIds: readonly string[];
  waypoint: { x: number; z: number } | null;
}

export function CoastDistrict({ collectedIds, waypoint }: CoastDistrictProps) {
  const taken = useMemo(() => new Set(collectedIds), [collectedIds]);
  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.5, 8]} colliders="cuboid" friction={1}>
        <mesh receiveShadow>
          <boxGeometry args={[100, 1, 64]} />
          <meshStandardMaterial color="#6e6a62" roughness={1} />
        </mesh>
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, -38]} receiveShadow>
        <planeGeometry args={[160, 36]} />
        <meshStandardMaterial color="#3c8f9c" roughness={0.28} metalness={0.06} />
      </mesh>
      <Slab x={-28} z={-21.7} w={9} d={3.4} color="#8a6844" />
      <Roads />
      <Boats />
      {SOLIDS.filter((solid) => solid.kind !== "crate" || !taken.has(solid.id)).map((solid) => (
        <Block key={solid.id} solid={solid} />
      ))}
      <Signs />
      <WaypointMarker point={waypoint} />
    </group>
  );
}

function Roads() {
  return (
    <group>
      <Road x={0} z={-12.5} w={90} d={7} />
      <Road x={0} z={15.5} w={90} d={7} />
      <Road x={0} z={1.5} w={7} d={35} />
      <Slab x={0} z={-20.2} w={90} d={6} color="#b9b3a8" />
      <Slab x={-24} z={-8.3} w={40} d={1.5} color="#c4beb4" />
      <Slab x={24} z={-8.3} w={40} d={1.5} color="#c4beb4" />
      <Slab x={-24} z={11.2} w={40} d={1.4} color="#c4beb4" />
      <Slab x={24} z={11.2} w={40} d={1.4} color="#c4beb4" />
      {[-2.2, -0.7, 0.8, 2.3].map((x) => (
        <Slab key={x} x={x} z={-15.7} w={0.45} d={2.4} color="#efe7da" />
      ))}
      {[-18, -6, 8, 20, 32].map((x) => (
        <Slab key={`dash-${x}`} x={x} z={-12.5} w={2.2} d={0.12} color="#e6d7a2" />
      ))}
    </group>
  );
}

function Road({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <mesh position={[x, 0.015, z]} receiveShadow>
      <boxGeometry args={[w, 0.03, d]} />
      <meshStandardMaterial color="#2c3136" roughness={0.94} />
    </mesh>
  );
}

function Slab({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  return (
    <mesh position={[x, 0.02, z]} receiveShadow>
      <boxGeometry args={[w, 0.025, d]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function Boats() {
  return (
    <group>
      {[-32, -18, -6].map((x) => (
        <group key={x} position={[x, 0.05, -29]}>
          <mesh castShadow position={[0, 0.28, 0]}>
            <boxGeometry args={[1.6, 0.42, 4.4]} />
            <meshStandardMaterial color="#e6e0d4" roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.62, -0.35]}>
            <boxGeometry args={[1.15, 0.5, 1.5]} />
            <meshStandardMaterial color="#3d4b58" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.35, 0.2]}>
            <boxGeometry args={[0.08, 1.7, 0.08]} />
            <meshStandardMaterial color="#efe7da" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Block({ solid }: { solid: Solid }) {
  if (solid.id === "seawall") return <Seawall solid={solid} />;
  if (solid.kind === "trunk") return <Palm solid={solid} />;
  if (solid.kind === "person") return <Contact solid={solid} />;
  if (solid.kind === "pole") return <Pole solid={solid} />;
  const windows = solid.kind === "building";
  return (
    <RigidBody type="fixed" position={[solid.x, solid.y, solid.z]} colliders="cuboid" friction={0.9}>
      <mesh castShadow={windows || solid.kind === "vehicle"} receiveShadow>
        <boxGeometry args={[solid.w, solid.h, solid.d]} />
        <meshStandardMaterial color={solid.color} roughness={solid.kind === "vehicle" ? 0.45 : 0.88} metalness={0.04} />
      </mesh>
      {solid.kind === "vehicle" ? <Cabin solid={solid} /> : null}
      {windows ? <Facade solid={solid} /> : null}
    </RigidBody>
  );
}

function Cabin({ solid }: { solid: Solid }) {
  return (
    <mesh position={[0, solid.h * 0.18, 0.05]} castShadow>
      <boxGeometry args={[solid.w * 0.55, solid.h * 0.42, solid.d * 0.72]} />
      <meshStandardMaterial color="#1c232b" roughness={0.3} metalness={0.2} />
    </mesh>
  );
}

function Facade({ solid }: { solid: Solid }) {
  const floors = Math.max(1, Math.round(solid.h / 3.4));
  const bands = [];
  for (let floor = 0; floor < floors; floor += 1) {
    const y = -solid.h / 2 + 1.5 + floor * 3.1;
    if (y > solid.h / 2 - 0.5) break;
    bands.push(y);
  }
  return (
    <group>
      {bands.map((y) => (
        <mesh key={y} position={[0, y, solid.d / 2 - 0.05]}>
          <boxGeometry args={[solid.w * 0.72, 0.7, 0.06]} />
          <meshStandardMaterial color="#1b242c" roughness={0.22} metalness={0.35} />
        </mesh>
      ))}
      {solid.accent ? (
        <mesh position={[0, solid.h / 2 - 0.18, 0]}>
          <boxGeometry args={[solid.w * 0.96, 0.28, solid.d * 0.96]} />
          <meshStandardMaterial color={solid.accent} roughness={0.8} />
        </mesh>
      ) : null}
      {solid.id === "warehouse-3" ? (
        <mesh position={[-solid.w / 2 + 0.08, -solid.h / 2 + 2.1, 0]}>
          <boxGeometry args={[0.08, 3.5, solid.d * 0.42]} />
          <meshStandardMaterial color="#242826" roughness={0.7} />
        </mesh>
      ) : null}
      {solid.id === "salt-cafe" ? (
        <mesh position={[0, -0.2, -solid.d / 2 + 0.7]}>
          <boxGeometry args={[solid.w * 0.86, 0.08, 0.8]} />
          <meshStandardMaterial color={solid.accent ?? "#8f3f36"} roughness={0.7} />
        </mesh>
      ) : null}
    </group>
  );
}

function Seawall({ solid }: { solid: Solid }) {
  return (
    <RigidBody type="fixed" position={[solid.x, 0, solid.z]} colliders={false} friction={1}>
      <CuboidCollider args={[solid.w / 2, 1.2, solid.d / 2]} position={[0, 1.2, 0]} />
      <mesh position={[0, 0.36, 0]} receiveShadow>
        <boxGeometry args={[solid.w, 0.72, solid.d]} />
        <meshStandardMaterial color={solid.color} roughness={0.92} />
      </mesh>
    </RigidBody>
  );
}

function Palm({ solid }: { solid: Solid }) {
  return (
    <group position={[solid.x, 0, solid.z]}>
      <RigidBody type="fixed" position={[0, solid.y, 0]} colliders="cuboid">
        <mesh castShadow>
          <cylinderGeometry args={[0.14, 0.22, solid.h, 6]} />
          <meshStandardMaterial color={solid.color} roughness={0.92} />
        </mesh>
      </RigidBody>
      {[0, 1.2, 2.4, 3.6, 4.8].map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * 0.7, solid.h + 0.15, Math.sin(angle) * 0.7]} rotation={[0.7, angle, 0]}>
          <boxGeometry args={[0.18, 0.05, 1.5]} />
          <meshStandardMaterial color="#617a56" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Pole({ solid }: { solid: Solid }) {
  const beacon = solid.id === "beacon";
  return (
    <RigidBody type="fixed" position={[solid.x, solid.y, solid.z]} colliders="cuboid">
      <mesh castShadow={beacon}>
        <cylinderGeometry args={[beacon ? 0.16 : 0.07, beacon ? 0.2 : 0.09, solid.h, 6]} />
        <meshStandardMaterial color={solid.color} roughness={0.7} />
      </mesh>
      <mesh position={[0, solid.h / 2 - 0.12, 0]}>
        <boxGeometry args={[beacon ? 0.34 : 0.46, 0.1, 0.22]} />
        <meshStandardMaterial color="#e7a25a" emissive="#e7a25a" emissiveIntensity={beacon ? 0.9 : 0.45} />
      </mesh>
    </RigidBody>
  );
}

function Contact({ solid }: { solid: Solid }) {
  return (
    <RigidBody type="fixed" position={[solid.x, solid.y, solid.z]} colliders="cuboid" friction={0.8}>
      <mesh castShadow position={[0, -0.15, 0]}>
        <capsuleGeometry args={[0.22, 0.7, 4, 8]} />
        <meshStandardMaterial color="#24343c" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#c4a484" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.05, 0.16]}>
        <boxGeometry args={[0.28, 0.08, 0.04]} />
        <meshStandardMaterial color="#efe7da" roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}

function Signs() {
  return (
    <group>
      {SOLIDS.filter((solid) => solid.label && solid.sign).map((solid) => (
        <Sign key={solid.id} solid={solid} />
      ))}
      <Sign
        solid={{
          id: "beacon-sign",
          x: -32,
          z: -21.2,
          w: 0,
          d: 0,
          y: 5.4,
          h: 0,
          kind: "pole",
          color: "#efe7da",
          label: "MARINA",
          sign: "south",
        }}
      />
    </group>
  );
}

function Sign({ solid }: { solid: Solid }) {
  const texture = useMemo(() => makeLabel(solid.label ?? ""), [solid.label]);
  useEffect(() => () => texture.dispose(), [texture]);
  const south = solid.sign !== "west";
  const position: [number, number, number] = south
    ? [solid.x, solid.y + solid.h * 0.28, solid.z - solid.d / 2 - 0.06]
    : [solid.x - solid.w / 2 - 0.06, solid.y + solid.h * 0.18, solid.z];
  return (
    <mesh position={position} rotation={[0, south ? Math.PI : -Math.PI / 2, 0]}>
      <planeGeometry args={[solid.w > 4 ? 3.4 : 1.8, 0.55]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}

function makeLabel(text: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(18, 22, 28, 0.55)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#efe7da";
    context.font = "600 54px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 256, 50);
  }
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function WaypointMarker({ point }: { point: { x: number; z: number } | null }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const pulse = 0.55 + Math.sin(clock.elapsedTime * 2.2) * 0.15;
    group.current.scale.setScalar(pulse + 0.7);
  });
  if (!point) return null;
  return (
    <group position={[point.x, 0.06, point.z]}>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 2.6, 6]} />
        <meshBasicMaterial color="#e7a25a" transparent opacity={0.8} />
      </mesh>
      <mesh ref={group} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.86, 28]} />
        <meshBasicMaterial color="#e7a25a" transparent opacity={0.75} side={DoubleSide} />
      </mesh>
    </group>
  );
}
