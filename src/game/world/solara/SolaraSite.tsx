"use client";

import { useLayoutEffect, useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { useGLTF, useTexture } from "@react-three/drei";
import { NoColorSpace, PlaneGeometry, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

const MODEL = "/models/buildings/solara-tower.glb";

/** Matches blender/solara/build_solara.py. glTF Z is the opposite of Blender Y. */
const POD_RX = 22.4;
const POD_RY = 16.2;
const POD_N = 2.7;
const PODIUM_HEIGHT = 22.5;
const ENTRANCE_TOP = 7.55;
const ENTRANCE_HALF = 4.7;
const WALLS = 32;

export function SolaraSite() {
  return (
    <group>
      <SiteSurfaces />
      <TowerModel />
      <PodiumColliders />
      <RigidBody type="fixed" position={[0, PODIUM_HEIGHT / 2, -0.3]} colliders={false} friction={0.8}>
        <CuboidCollider args={[3.4, PODIUM_HEIGHT / 2, 2.9]} />
      </RigidBody>
      {[{ x: -3.15, z: -21.05 }, { x: 3.15, z: -21.05 }].map((column) => (
        <RigidBody key={column.x} type="fixed" position={[column.x, ENTRANCE_TOP / 2, column.z]} colliders={false}>
          <CylinderCollider args={[ENTRANCE_TOP / 2, 0.36]} />
        </RigidBody>
      ))}
      {[{ x: -11.5, z: -20.9 }, { x: 11.5, z: -20.9 }].map((pool) => (
        <RigidBody key={pool.x} type="fixed" position={[pool.x, 0.2, pool.z]} colliders={false} friction={0.6}>
          <CuboidCollider args={[3.4, 0.2, 2.7]} />
        </RigidBody>
      ))}
    </group>
  );
}

function TowerModel() {
  const gltf = useGLTF(MODEL);
  useLayoutEffect(() => {
    gltf.scene.traverse((node) => {
      const mesh = node as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [gltf.scene]);
  return <primitive object={gltf.scene} />;
}

function PodiumColliders() {
  const segments = useMemo(() => wallSegments(), []);
  return (
    <group>
      {segments.map((segment) => (
        <RigidBody
          key={segment.key}
          type="fixed"
          position={[segment.x, segment.y, segment.z]}
          rotation={[0, segment.yaw, 0]}
          colliders={false}
          friction={0.9}
        >
          <CuboidCollider args={[segment.half, segment.halfY, segment.thick]} />
        </RigidBody>
      ))}
    </group>
  );
}

interface WallSegment {
  key: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  half: number;
  halfY: number;
  thick: number;
}

function wallSegments(): WallSegment[] {
  const points = Array.from({ length: WALLS }, (_, index) => {
    const theta = (index / WALLS) * Math.PI * 2;
    return superPoint(theta);
  });
  const bands = [
    { name: "low", y0: 0, y1: ENTRANCE_TOP, door: true },
    { name: "high", y0: ENTRANCE_TOP, y1: PODIUM_HEIGHT, door: false },
  ];
  const segments: WallSegment[] = [];
  for (const band of bands) {
    for (let index = 0; index < WALLS; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % WALLS];
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      if (band.door && mz < -POD_RY * 0.72 && Math.abs(mx) < ENTRANCE_HALF) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      const yaw = Math.atan2(-dz, dx);
      const outwardX = Math.cos(yaw + Math.PI / 2);
      const outwardZ = -Math.sin(yaw + Math.PI / 2);
      segments.push({
        key: `${band.name}-${index}`,
        x: mx + outwardX * 0.35,
        y: (band.y0 + band.y1) / 2,
        z: mz + outwardZ * 0.35,
        yaw,
        half: length / 2 + 0.08,
        halfY: (band.y1 - band.y0) / 2,
        thick: 0.7,
      });
    }
  }
  return segments;
}

function superPoint(theta: number): { x: number; z: number } {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const e = 2 / POD_N;
  const x = Math.abs(c) > 1e-8 ? POD_RX * Math.sign(c) * Math.abs(c) ** e : 0;
  const y = Math.abs(s) > 1e-8 ? POD_RY * Math.sign(s) * Math.abs(s) ** e : 0;
  return { x, z: -y };
}

function SiteSurfaces() {
  const asphalt = useSurface("/textures/asphalt");
  const concrete = useSurface("/textures/concrete");
  return (
    <group>
      <TiledPlane x={0} z={-8} w={230} d={230} y={0.006} tile={6} maps={concrete} color="#e7e1d6" roughness={0.94} />
      <TiledPlane x={0} z={-50} w={112} d={8} y={0.02} tile={2.5} maps={asphalt} color="#8d9298" roughness={0.9} />
      <TiledPlane x={0} z={38} w={112} d={8} y={0.02} tile={2.5} maps={asphalt} color="#8d9298" roughness={0.9} />
      <TiledPlane x={52} z={-6} w={8} d={96} y={0.02} tile={2.5} maps={asphalt} color="#8d9298" roughness={0.9} />
      <TiledPlane x={-52} z={-6} w={8} d={96} y={0.02} tile={2.5} maps={asphalt} color="#8d9298" roughness={0.9} />
      <TiledPlane x={0} z={-43.2} w={96} d={4.2} y={0.028} tile={2} maps={concrete} color="#d9d3c8" roughness={0.86} />
      <TiledPlane x={0} z={31.2} w={96} d={4.2} y={0.028} tile={2} maps={concrete} color="#d9d3c8" roughness={0.86} />
      <TiledPlane x={45.2} z={-6} w={4.2} d={78} y={0.028} tile={2} maps={concrete} color="#d9d3c8" roughness={0.86} />
      <TiledPlane x={-45.2} z={-6} w={4.2} d={78} y={0.028} tile={2} maps={concrete} color="#d9d3c8" roughness={0.86} />
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

useGLTF.preload(MODEL);
useTexture.preload("/textures/asphalt/diff.jpg");
useTexture.preload("/textures/asphalt/nor.jpg");
useTexture.preload("/textures/asphalt/rough.jpg");
useTexture.preload("/textures/concrete/diff.jpg");
useTexture.preload("/textures/concrete/nor.jpg");
useTexture.preload("/textures/concrete/rough.jpg");
