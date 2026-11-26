"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useAnimations, useGLTF, useTexture } from "@react-three/drei";
import {
  CanvasTexture,
  DoubleSide,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
  type Texture,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { MarinaOfficeInterior } from "@/game/world/interiors/EnterableBuilding";
import { SOLIDS, type Solid } from "@/game/world/coast/layout";
import { Ocean } from "@/game/world/life/Ocean";
import { PEOPLE } from "@/game/world/life/people";
import { BENCHES, PARK } from "@/game/world/life/routes";

interface CoastDistrictProps {
  collectedIds: readonly string[];
  waypoint: { x: number; z: number } | null;
}

export function CoastDistrict({ collectedIds, waypoint }: CoastDistrictProps) {
  const taken = useMemo(() => new Set(collectedIds), [collectedIds]);
  return (
    <group>
      <mesh position={[0, -0.5, 8]}>
        <boxGeometry args={[100, 1, 64]} />
        <meshStandardMaterial color="#c6b6a2" roughness={1} />
      </mesh>
      <Suspense fallback={null}>
        <LandCover />
      </Suspense>
      <Ocean />
      <Slab x={-28} z={-21.7} w={9} d={3.4} color="#8a6844" />
      <Suspense fallback={null}>
        <Roads />
      </Suspense>
      <ParkGreen />
      <Benches />
      <Signals />
      {SOLIDS.filter((solid) => solid.id !== "marina-office" && (solid.kind !== "crate" || !taken.has(solid.id))).map(
        (solid) => (
          <Block key={solid.id} solid={solid} />
        ),
      )}
      <MarinaOfficeInterior />
      <Signs />
      <WaypointMarker point={waypoint} />
    </group>
  );
}

function LandCover() {
  const concrete = useSurface("/textures/concrete");
  return <TiledPlane x={0} z={8} w={100} d={64} y={0.012} tile={4} maps={concrete} color="#c6b6a2" roughness={0.92} />;
}

function Roads() {
  const asphalt = useSurface("/textures/asphalt");
  const concrete = useSurface("/textures/concrete");
  return (
    <group>
      <Road x={0} z={-12.5} w={90} d={7} maps={asphalt} />
      <Road x={0} z={15.5} w={90} d={7} maps={asphalt} />
      <Road x={0} z={1.5} w={7} d={35} maps={asphalt} />
      <TiledPlane x={0} z={-20.2} w={90} d={6} y={0.02} tile={2} maps={concrete} color="#d5cfc4" roughness={0.84} />
      <TiledPlane x={-24} z={-8.3} w={40} d={1.5} y={0.02} tile={2} maps={concrete} color="#d5cfc4" roughness={0.84} />
      <TiledPlane x={24} z={-8.3} w={40} d={1.5} y={0.02} tile={2} maps={concrete} color="#d5cfc4" roughness={0.84} />
      <TiledPlane x={-24} z={11.2} w={40} d={1.4} y={0.02} tile={2} maps={concrete} color="#d5cfc4" roughness={0.84} />
      <TiledPlane x={24} z={11.2} w={40} d={1.4} y={0.02} tile={2} maps={concrete} color="#d5cfc4" roughness={0.84} />
      {[-2.2, -0.7, 0.8, 2.3].map((x) => (
        <Slab key={x} x={x} z={-15.7} w={0.45} d={2.4} color="#efe7da" />
      ))}
      {[-18, -6, 8, 20, 32].map((x) => (
        <Slab key={`dash-${x}`} x={x} z={-12.5} w={2.2} d={0.12} color="#e6d7a2" />
      ))}
    </group>
  );
}

type SurfaceMaps = { map: Texture; normalMap: Texture; roughnessMap: Texture };

function useSurface(folder: string): SurfaceMaps {
  const maps = useTexture({
    map: `${folder}/diff.jpg`,
    normalMap: `${folder}/nor.jpg`,
    roughnessMap: `${folder}/rough.jpg`,
  });
  useLayoutEffect(() => {
    maps.map.colorSpace = SRGBColorSpace;
    maps.normalMap.colorSpace = NoColorSpace;
    maps.roughnessMap.colorSpace = NoColorSpace;
    for (const tex of [maps.map, maps.normalMap, maps.roughnessMap]) {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.anisotropy = 8;
    }
  }, [maps]);
  return maps;
}

function TiledPlane({
  x,
  z,
  w,
  d,
  y,
  tile,
  maps,
  color,
  roughness,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  tile: number;
  maps: SurfaceMaps;
  color: string;
  roughness: number;
}) {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(w, d);
    plane.rotateX(-Math.PI / 2);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (d / tile));
    return plane;
  }, [w, d, tile]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[x, y, z]} receiveShadow>
      <meshStandardMaterial
        color={color}
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        roughness={roughness}
        metalness={0.02}
      />
    </mesh>
  );
}

function Road({ x, z, w, d, maps }: { x: number; z: number; w: number; d: number; maps: SurfaceMaps }) {
  return <TiledPlane x={x} z={z} w={w} d={d} y={0.02} tile={2.5} maps={maps} color="#8a9096" roughness={0.9} />;
}

function Slab({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  return (
    <mesh position={[x, 0.02, z]} receiveShadow>
      <boxGeometry args={[w, 0.025, d]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
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
      {solid.kind === "vehicle" ? (
        <>
          <Cabin solid={solid} />
          {[
            [-solid.w * 0.42, solid.d * 0.32],
            [solid.w * 0.42, solid.d * 0.32],
            [-solid.w * 0.42, -solid.d * 0.32],
            [solid.w * 0.42, -solid.d * 0.32],
          ].map(([x, z]) => (
            <mesh key={`${x}-${z}`} position={[x, -solid.h / 2 + 0.28, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.16, 10]} />
              <meshStandardMaterial color="#1a1d20" roughness={0.65} />
            </mesh>
          ))}
        </>
      ) : null}
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
  const floors = Math.max(1, Math.round(solid.h / 3.2));
  const bands = [];
  for (let floor = 0; floor < floors; floor += 1) {
    const y = -solid.h / 2 + 1.7 + floor * 3.05;
    if (y > solid.h / 2 - 0.55) break;
    bands.push(y);
  }
  const glass = windowTexture();
  return (
    <group>
      {bands.map((y, floor) => (
        <group key={y}>
          <mesh position={[0, y, solid.d / 2 + 0.03]} castShadow>
            <boxGeometry args={[solid.w * 0.76, 1.2, 0.08]} />
            <meshStandardMaterial map={glass ?? undefined} color="#d5e0e6" roughness={0.16} metalness={0.45} />
          </mesh>
          {floor % 2 === 1 ? (
            <mesh position={[0, y - 0.78, solid.d / 2 + 0.28]}>
              <boxGeometry args={[solid.w * 0.5, 0.08, 0.46]} />
              <meshStandardMaterial color={solid.accent ?? "#cfc6ba"} roughness={0.72} />
            </mesh>
          ) : null}
        </group>
      ))}
      <mesh position={[solid.w * 0.22, solid.h / 2 + 0.38, solid.d * 0.1]} castShadow>
        <boxGeometry args={[Math.min(2.4, solid.w * 0.28), 0.7, Math.min(2.2, solid.d * 0.28)]} />
        <meshStandardMaterial color="#8a847c" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, -solid.h / 2 + 1.15, solid.d / 2 + 0.06]}>
        <boxGeometry args={[solid.w * 0.62, 1.7, 0.08]} />
        <meshStandardMaterial color="#efe7da" roughness={0.4} />
      </mesh>
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
  const gap = 3.4;
  const gapCenter = -18;
  const leftEdge = -solid.w / 2;
  const rightEdge = solid.w / 2;
  const gapWest = gapCenter - gap / 2;
  const gapEast = gapCenter + gap / 2;
  const spans = [
    { from: leftEdge, to: gapWest },
    { from: gapEast, to: rightEdge },
  ];
  return (
    <RigidBody type="fixed" position={[solid.x, 0, solid.z]} colliders={false} friction={1}>
      {spans.map((span) => {
        const width = span.to - span.from;
        const center = (span.from + span.to) / 2;
        return (
          <group key={center} position={[center, 0, 0]}>
            <CuboidCollider args={[width / 2, 1.2, solid.d / 2]} position={[0, 1.2, 0]} />
            <mesh position={[0, 0.36, 0]} receiveShadow>
              <boxGeometry args={[width, 0.72, solid.d]} />
              <meshStandardMaterial color={solid.color} roughness={0.92} />
            </mesh>
          </group>
        );
      })}
    </RigidBody>
  );
}

function Palm({ solid }: { solid: Solid }) {
  const gltf = useGLTF("/models/environment/palm.glb");
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return (
    <group position={[solid.x, 0, solid.z]}>
      <RigidBody type="fixed" position={[0, solid.y, 0]} colliders="cuboid">
        <mesh visible={false}>
          <boxGeometry args={[solid.w, solid.h, solid.d]} />
        </mesh>
      </RigidBody>
      <primitive object={scene} />
    </group>
  );
}

function Pole({ solid }: { solid: Solid }) {
  if (solid.id !== "beacon") return <StreetLamp solid={solid} />;
  const beacon = true;
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

function StreetLamp({ solid }: { solid: Solid }) {
  const gltf = useGLTF("/models/props/streetlight.glb");
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return (
    <group position={[solid.x, 0, solid.z]}>
      <RigidBody type="fixed" position={[0, solid.y, 0]} colliders="cuboid">
        <mesh visible={false}>
          <boxGeometry args={[solid.w, solid.h, solid.d]} />
        </mesh>
      </RigidBody>
      <primitive object={scene} />
    </group>
  );
}

function Contact({ solid }: { solid: Solid }) {
  const gltf = useGLTF(PEOPLE[5]);
  const scene = useMemo(() => cloneSkeleton(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, scene);
  useEffect(() => {
    actions.Idle?.reset().play();
  }, [actions]);
  return (
    <RigidBody type="fixed" position={[solid.x, solid.y, solid.z]} colliders="cuboid" friction={0.8}>
      <mesh visible={false}>
        <boxGeometry args={[0.5, solid.h, 0.5]} />
      </mesh>
      <group position={[0, -solid.y, 0]} scale={0.55}>
        <primitive object={scene} />
      </group>
    </RigidBody>
  );
}

function ParkGreen() {
  const tree = useGLTF("/models/environment/tree.glb");
  const bush = useGLTF("/models/environment/bush.glb");
  const clones = useMemo(
    () => [tree.scene.clone(true), tree.scene.clone(true), bush.scene.clone(true), bush.scene.clone(true)],
    [bush.scene, tree.scene],
  );
  return (
    <group position={[PARK.x, 0.03, PARK.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PARK.w, PARK.d]} />
        <meshStandardMaterial color="#6d7a62" roughness={0.96} />
      </mesh>
      <primitive object={clones[0]} position={[-3.2, 0, -1]} />
      <primitive object={clones[1]} position={[3.4, 0, 1.2]} />
      <primitive object={clones[2]} position={[-1, 0, 2]} />
      <primitive object={clones[3]} position={[1.5, 0, -2]} />
    </group>
  );
}

function Benches() {
  return (
    <group>
      {BENCHES.map((bench) => (
        <group key={`${bench.x}`} position={[bench.x, 0.28, bench.z]}>
          <mesh castShadow>
            <boxGeometry args={[1.4, 0.08, 0.42]} />
            <meshStandardMaterial color="#8a6844" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.28, -0.16]}>
            <boxGeometry args={[1.4, 0.42, 0.08]} />
            <meshStandardMaterial color="#8a6844" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Signals() {
  const gltf = useGLTF("/models/props/traffic-light.glb");
  const spots: Array<[number, number]> = [
    [-4.4, -9.4],
    [4.4, -15.5],
    [-4.4, 12.4],
    [4.4, 18.3],
  ];
  const models = useMemo(() => spots.map(() => gltf.scene.clone(true)), [gltf.scene]);
  return (
    <group>
      {spots.map(([x, z], index) => (
        <primitive key={`${x}-${z}`} object={models[index]} position={[x, 0, z]} />
      ))}
    </group>
  );
}

function windowTexture(): CanvasTexture | null {
  if (sharedWindows) return sharedWindows;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#16303a";
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = "#c5d5de";
    for (let y = 10; y < 128; y += 32) {
      for (let x = 10; x < 128; x += 30) context.fillRect(x, y, 16, 18);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 1);
  sharedWindows = texture;
  return texture;
}

let sharedWindows: CanvasTexture | null = null;

for (const folder of ["/textures/asphalt", "/textures/concrete"]) {
  useTexture.preload(`${folder}/diff.jpg`);
  useTexture.preload(`${folder}/nor.jpg`);
  useTexture.preload(`${folder}/rough.jpg`);
}

useGLTF.preload("/models/environment/palm.glb");
useGLTF.preload("/models/environment/tree.glb");
useGLTF.preload("/models/environment/bush.glb");
useGLTF.preload("/models/props/streetlight.glb");
useGLTF.preload("/models/props/traffic-light.glb");
useGLTF.preload(PEOPLE[5]);

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
