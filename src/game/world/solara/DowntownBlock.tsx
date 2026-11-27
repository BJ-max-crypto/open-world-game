"use client";

import { useLayoutEffect, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useGLTF, useTexture } from "@react-three/drei";
import { NoColorSpace, PlaneGeometry, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import metrics from "@/game/world/solara/downtown-metrics.json";

const MODEL = "/models/buildings/downtown-block.glb";

export function DowntownBlock() {
  return (
    <group>
      <Streets />
      <BlockModel />
      {metrics.buildings.map((building) => (
        <RigidBody
          key={building.id}
          type="fixed"
          position={[building.x, building.height / 2, building.z]}
          colliders={false}
          friction={0.9}
        >
          <CuboidCollider args={[building.hx, building.height / 2, building.hz]} />
        </RigidBody>
      ))}
    </group>
  );
}

function BlockModel() {
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

function Streets() {
  const asphalt = useSurface("/textures/asphalt");
  const concrete = useSurface("/textures/concrete");
  const curbs = metrics.roads.flatMap(curbPair);
  const dashes = metrics.roads.flatMap(laneDashes);
  const stripes = crosswalkStripes();
  return (
    <group>
      {metrics.roads.map((road) => (
        <TiledPlane
          key={road.id}
          x={road.x}
          z={road.z}
          w={road.w}
          d={road.d}
          y={0.02}
          tile={2.5}
          maps={asphalt}
          color="#8d9298"
          roughness={0.9}
        />
      ))}
      {metrics.sidewalks.map((walk, index) => (
        <TiledPlane
          key={`walk-${index}`}
          x={walk.x}
          z={walk.z}
          w={walk.w}
          d={walk.d}
          y={0.028}
          tile={2}
          maps={concrete}
          color="#d9d3c8"
          roughness={0.86}
        />
      ))}
      {metrics.stalls.map((stall, index) => (
        <TiledPlane
          key={`stall-pad-${index}`}
          x={stall.x}
          z={stall.z}
          w={stall.w}
          d={stall.d}
          y={0.025}
          tile={2}
          maps={concrete}
          color="#cfc6b8"
          roughness={0.88}
        />
      ))}
      {curbs.map((curb, index) => (
        <mesh key={`curb-${index}`} position={[curb.x, 0.08, curb.z]} receiveShadow castShadow>
          <boxGeometry args={[curb.w, 0.14, curb.d]} />
          <meshStandardMaterial color="#d5d0c6" roughness={0.84} />
        </mesh>
      ))}
      {dashes.map((dash, index) => (
        <mesh key={`dash-${index}`} position={[dash.x, 0.035, dash.z]}>
          <boxGeometry args={[dash.w, 0.012, dash.d]} />
          <meshStandardMaterial color="#f4f0e4" roughness={0.6} />
        </mesh>
      ))}
      {stripes.map((stripe, index) => (
        <mesh key={`stripe-${index}`} position={[stripe.x, 0.038, stripe.z]}>
          <boxGeometry args={[stripe.w, 0.012, stripe.d]} />
          <meshStandardMaterial color="#f7f4ee" roughness={0.55} />
        </mesh>
      ))}
      {stallLines().map((line, index) => (
        <mesh key={`stall-${index}`} position={[line.x, 0.04, line.z]}>
          <boxGeometry args={[line.w, 0.012, line.d]} />
          <meshStandardMaterial color="#f4f0e4" roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function curbPair(road: { w: number; d: number; x: number; z: number }) {
  const gap = 8;
  if (road.w >= road.d) {
    const length = Math.max(4, road.w - gap * 2);
    return [
      { x: road.x, z: road.z + road.d / 2 + 0.16, w: length, d: 0.28 },
      { x: road.x, z: road.z - road.d / 2 - 0.16, w: length, d: 0.28 },
    ];
  }
  const length = Math.max(4, road.d - gap * 2);
  return [
    { x: road.x + road.w / 2 + 0.16, z: road.z, w: 0.28, d: length },
    { x: road.x - road.w / 2 - 0.16, z: road.z, w: 0.28, d: length },
  ];
}

function laneDashes(road: { w: number; d: number; x: number; z: number }) {
  const dashes: { x: number; z: number; w: number; d: number }[] = [];
  if (road.w >= road.d) {
    const count = Math.floor(road.w / 8);
    for (let i = 0; i < count; i += 1) {
      const x = road.x - road.w / 2 + 6 + i * 8;
      dashes.push({ x, z: road.z, w: 2.2, d: 0.12 });
    }
  } else {
    const count = Math.floor(road.d / 8);
    for (let i = 0; i < count; i += 1) {
      const z = road.z - road.d / 2 + 6 + i * 8;
      dashes.push({ x: road.x, z, w: 0.12, d: 2.2 });
    }
  }
  return dashes;
}

function crosswalkStripes() {
  const stripes: { x: number; z: number; w: number; d: number }[] = [];
  for (const mark of metrics.crosswalks) {
    if (mark.x === 0) {
      pushAcrossEastWest(stripes, mark.x, mark.z);
      continue;
    }
    pushAcrossEastWest(stripes, mark.x, mark.z);
    pushAcrossNorthSouth(stripes, mark.x, mark.z);
  }
  return stripes;
}

function pushAcrossEastWest(stripes: { x: number; z: number; w: number; d: number }[], x: number, z: number) {
  for (let i = -3; i <= 3; i += 1) {
    stripes.push({ x: x + i * 0.85, z, w: 0.42, d: 6.2 });
  }
}

function pushAcrossNorthSouth(stripes: { x: number; z: number; w: number; d: number }[], x: number, z: number) {
  for (let i = -3; i <= 3; i += 1) {
    stripes.push({ x, z: z + i * 0.85, w: 6.2, d: 0.42 });
  }
}

function stallLines() {
  const lines: { x: number; z: number; w: number; d: number }[] = [];
  const lot = metrics.stalls[0];
  for (let i = 0; i < 4; i += 1) {
    const z = lot.z - lot.d / 2 + 2 + i * 4;
    lines.push({ x: lot.x, z, w: lot.w - 0.4, d: 0.1 });
  }
  const bay = metrics.stalls[1];
  for (let i = 0; i < 4; i += 1) {
    const x = bay.x - bay.w / 2 + 2.6 + i * 5.2;
    lines.push({ x, z: bay.z, w: 0.1, d: bay.d - 0.4 });
  }
  return lines;
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
