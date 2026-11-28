"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import {
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  NoColorSpace,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Sphere,
  SphereGeometry,
  Vector3,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import scene from "@/game/world/solara/streetscape.json";
import { medianBeds, roadPaint } from "@/game/world/solara/streetscape";

const FRAME = "#e8e2d6";
const STONE = "#ddd4c6";
const GLASS = "#d5e4ec";
const INTERIOR = "#1b252d";
const BOUNDS = new Sphere(new Vector3(0, 2, 0), 430);

type SurfaceKind = "field" | "lawn" | "bed" | "stone" | "path" | "parking" | "alley";

const SURFACE: Record<SurfaceKind, { y: number; color: string; tile: number; paved: boolean }> = {
  field: { y: 0.01, color: "#8eae76", tile: 4, paved: false },
  lawn: { y: 0.012, color: "#6d985c", tile: 4, paved: false },
  bed: { y: 0.013, color: "#4c7246", tile: 4, paved: false },
  stone: { y: 0.015, color: "#e4dcd0", tile: 2.2, paved: true },
  path: { y: 0.016, color: "#d2c9bb", tile: 1.5, paved: true },
  parking: { y: 0.018, color: "#6a6f75", tile: 2.4, paved: true },
  alley: { y: 0.022, color: "#787d83", tile: 2.2, paved: true },
};

/**
 * Ground around the finished towers: block surfaces, boulevard paint, a planted median,
 * and three low street buildings. The tower meshes are not in this component.
 */
export function Streetscape() {
  return (
    <group>
      <Surfaces />
      <Median />
      <Paint />
      <Palms />
      <Shrubs />
      <Benches />
      <Lamps />
      <Planters />
      <Tables />
      {scene.pavilions.map((pavilion) => (
        <Pavilion key={pavilion.id} spec={pavilion} />
      ))}
      {scene.canopies.map((canopy) => (
        <Canopy key={canopy.id} spec={canopy} />
      ))}
      <LotLines />
    </group>
  );
}

function Surfaces() {
  const concrete = useSurface("/textures/concrete");
  const asphalt = useSurface("/textures/asphalt");
  const flats = useMemo(() => {
    return (["field", "lawn", "bed"] as const).map((kind) => {
      const style = SURFACE[kind];
      const parts = scene.surfaces
        .filter((surface) => surface.kind === kind)
        .map((surface) => {
          const geometry = new PlaneGeometry(surface.w, surface.d);
          geometry.rotateX(-Math.PI / 2);
          geometry.translate(surface.x, style.y, surface.z);
          return geometry;
        });
      return { kind, color: style.color, geometry: parts.length > 0 ? mergeGeometries(parts) : null };
    });
  }, []);
  return (
    <group>
      {flats.map((patch) =>
        patch.geometry ? (
          <mesh key={patch.kind} geometry={patch.geometry} receiveShadow>
            <meshStandardMaterial color={patch.color} roughness={0.96} />
          </mesh>
        ) : null,
      )}
      {scene.surfaces.map((surface) => {
        const style = SURFACE[surface.kind as SurfaceKind];
        if (!style.paved) return null;
        const maps = surface.kind === "parking" || surface.kind === "alley" ? asphalt : concrete;
        return (
          <TiledPlane
            key={surface.id}
            x={surface.x}
            z={surface.z}
            w={surface.w}
            d={surface.d}
            y={style.y}
            tile={style.tile}
            maps={maps}
            color={style.color}
          />
        );
      })}
    </group>
  );
}

function Median() {
  const beds = useMemo(() => medianBeds(), []);
  return (
    <group>
      {beds.map((bed) => (
        <mesh key={`bed-${bed.x}`} position={[bed.x, 0.06, bed.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[bed.w - 0.2, bed.d - 0.15]} />
          <meshStandardMaterial color="#5d8a52" roughness={0.94} />
        </mesh>
      ))}
      {beds.flatMap((bed) =>
        [-1, 1].map((side) => (
          <mesh
            key={`curb-${bed.x}-${side}`}
            position={[bed.x, 0.07, bed.z + side * (bed.d / 2 + 0.02)]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[bed.w, 0.12, 0.16]} />
            <meshStandardMaterial color="#d9d3c8" roughness={0.84} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Paint() {
  const marks = useMemo(() => roadPaint(), []);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const mesh = ref.current;
    if (!mesh) return;
    marks.forEach((mark, index) => {
      dummy.position.set(mark.x, 0.046, mark.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(mark.w, 0.01, mark.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = BOUNDS;
  }, [marks]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, marks.length]} frustumCulled>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f3f0e6" roughness={0.52} />
    </instancedMesh>
  );
}

function Palms() {
  const royal = useMemo(() => scene.palms.filter((palm) => palm.kind === "royal"), []);
  const sabal = useMemo(() => scene.palms.filter((palm) => palm.kind === "sabal"), []);
  return (
    <group>
      <PalmRow palms={royal} trunk={7.1} lean={1.05} frond={2.5} fronds={8} trunkColor="#8a7054" crown="#217043" />
      <PalmRow palms={sabal} trunk={4.8} lean={0.78} frond={1.85} fronds={9} trunkColor="#9a8464" crown="#3d8c4c" />
    </group>
  );
}

function PalmRow({
  palms,
  trunk,
  lean,
  frond,
  fronds,
  trunkColor,
  crown,
}: {
  palms: { x: number; z: number; s: number; yaw: number }[];
  trunk: number;
  lean: number;
  frond: number;
  fronds: number;
  trunkColor: string;
  crown: string;
}) {
  const trunkRef = useRef<InstancedMesh>(null);
  const crownRef = useRef<InstancedMesh>(null);
  const trunkGeo = useMemo(() => new CylinderGeometry(trunk * 0.022, trunk * 0.038, trunk, 6), [trunk]);
  const frondGeo = useMemo(() => {
    const geometry = new PlaneGeometry(frond * 0.22, frond);
    geometry.translate(0, frond * 0.42, 0);
    geometry.rotateZ(lean);
    return geometry;
  }, [frond, lean]);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const trunks = trunkRef.current;
    const crowns = crownRef.current;
    if (!trunks || !crowns) return;
    palms.forEach((palm, index) => {
      dummy.position.set(palm.x, (trunk / 2) * palm.s, palm.z);
      dummy.rotation.set(0, palm.yaw, 0);
      dummy.scale.setScalar(palm.s);
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);
      for (let blade = 0; blade < fronds; blade += 1) {
        dummy.position.set(palm.x, trunk * palm.s * 0.92, palm.z);
        dummy.rotation.set(0, palm.yaw + (blade * Math.PI * 2) / fronds, 0);
        dummy.scale.set(palm.s, palm.s, palm.s);
        dummy.updateMatrix();
        crowns.setMatrixAt(index * fronds + blade, dummy.matrix);
      }
    });
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    trunks.boundingSphere = BOUNDS;
    crowns.boundingSphere = BOUNDS;
  }, [fronds, palms, trunk]);
  if (palms.length === 0) return null;
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, undefined, palms.length]} castShadow>
        <meshStandardMaterial color={trunkColor} roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[frondGeo, undefined, palms.length * fronds]} castShadow>
        <meshStandardMaterial color={crown} roughness={0.74} side={DoubleSide} />
      </instancedMesh>
    </group>
  );
}

function Shrubs() {
  const ref = useRef<InstancedMesh>(null);
  const geo = useMemo(() => new SphereGeometry(0.55, 6, 5), []);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const mesh = ref.current;
    if (!mesh) return;
    scene.shrubs.forEach((shrub, index) => {
      dummy.position.set(shrub.x, 0.32 * shrub.s, shrub.z);
      dummy.rotation.set(0, index * 0.7, 0);
      dummy.scale.set(shrub.s, shrub.s * 0.72, shrub.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = BOUNDS;
  }, []);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, scene.shrubs.length]} castShadow>
      <meshStandardMaterial color="#3f7a46" roughness={0.86} />
    </instancedMesh>
  );
}

function Benches() {
  const seat = useRef<InstancedMesh>(null);
  const back = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const seats = seat.current;
    const backs = back.current;
    if (!seats || !backs) return;
    scene.benches.forEach((bench, index) => {
      dummy.rotation.set(0, bench.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(bench.x, 0.46, bench.z);
      dummy.updateMatrix();
      seats.setMatrixAt(index, dummy.matrix);
      const backZ = -0.2;
      dummy.position.set(
        bench.x + Math.sin(bench.yaw) * backZ,
        0.7,
        bench.z + Math.cos(bench.yaw) * backZ,
      );
      dummy.updateMatrix();
      backs.setMatrixAt(index, dummy.matrix);
    });
    seats.instanceMatrix.needsUpdate = true;
    backs.instanceMatrix.needsUpdate = true;
    seats.boundingSphere = BOUNDS;
    backs.boundingSphere = BOUNDS;
  }, []);
  return (
    <group>
      <instancedMesh ref={seat} args={[undefined, undefined, scene.benches.length]} castShadow>
        <boxGeometry args={[1.45, 0.08, 0.46]} />
        <meshStandardMaterial color="#c8b8a2" roughness={0.78} />
      </instancedMesh>
      <instancedMesh ref={back} args={[undefined, undefined, scene.benches.length]} castShadow>
        <boxGeometry args={[1.45, 0.36, 0.06]} />
        <meshStandardMaterial color="#b7a890" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function Lamps() {
  const pole = useRef<InstancedMesh>(null);
  const head = useRef<InstancedMesh>(null);
  const poleGeo = useMemo(() => new CylinderGeometry(0.06, 0.08, 4.6, 6), []);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const poles = pole.current;
    const heads = head.current;
    if (!poles || !heads) return;
    scene.lamps.forEach((lamp, index) => {
      dummy.position.set(lamp.x, 2.3, lamp.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(index, dummy.matrix);
      dummy.position.set(lamp.x, 4.62, lamp.z);
      dummy.updateMatrix();
      heads.setMatrixAt(index, dummy.matrix);
    });
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    poles.boundingSphere = BOUNDS;
    heads.boundingSphere = BOUNDS;
  }, []);
  return (
    <group>
      <instancedMesh ref={pole} args={[poleGeo, undefined, scene.lamps.length]} castShadow>
        <meshStandardMaterial color="#d5d8dc" roughness={0.42} metalness={0.45} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, scene.lamps.length]}>
        <boxGeometry args={[0.72, 0.08, 0.28]} />
        <meshStandardMaterial color="#fff4d2" emissive="#ffe2a4" emissiveIntensity={0.35} roughness={0.35} />
      </instancedMesh>
    </group>
  );
}

function Planters() {
  const box = useRef<InstancedMesh>(null);
  const plant = useRef<InstancedMesh>(null);
  const plantGeo = useMemo(() => new SphereGeometry(0.42, 6, 5), []);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const boxes = box.current;
    const plants = plant.current;
    if (!boxes || !plants) return;
    scene.planters.forEach((planter, index) => {
      dummy.position.set(planter.x, 0.28, planter.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      boxes.setMatrixAt(index, dummy.matrix);
      dummy.position.set(planter.x, 0.72, planter.z);
      dummy.scale.set(1, 0.75, 1);
      dummy.updateMatrix();
      plants.setMatrixAt(index, dummy.matrix);
    });
    boxes.instanceMatrix.needsUpdate = true;
    plants.instanceMatrix.needsUpdate = true;
    boxes.boundingSphere = BOUNDS;
    plants.boundingSphere = BOUNDS;
  }, []);
  return (
    <group>
      <instancedMesh ref={box} args={[undefined, undefined, scene.planters.length]} castShadow receiveShadow>
        <boxGeometry args={[1.35, 0.5, 1.35]} />
        <meshStandardMaterial color="#e3dbd0" roughness={0.84} />
      </instancedMesh>
      <instancedMesh ref={plant} args={[plantGeo, undefined, scene.planters.length]} castShadow>
        <meshStandardMaterial color="#2f6d40" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function Tables() {
  return (
    <group>
      {scene.tables.map((table) => (
        <group key={`${table.x}-${table.z}`} position={[table.x, 0, table.z]}>
          <mesh position={[0, 0.38, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 0.7, 8]} />
            <meshStandardMaterial color="#b7aa98" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.46, 0.46, 0.06, 14]} />
            <meshStandardMaterial color="#f4f0e8" roughness={0.58} />
          </mesh>
          {[-0.72, 0.72].map((offset) => (
            <mesh key={offset} position={[0, 0.46, offset]} castShadow>
              <boxGeometry args={[0.4, 0.05, 0.4]} />
              <meshStandardMaterial color="#d5cfc3" roughness={0.72} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Pavilion({
  spec,
}: {
  spec: { id: string; style: string; x: number; z: number; w: number; d: number; h: number };
}) {
  const { x, z, w, d, h, style } = spec;
  const accent = style === "cafe" ? "#e6ad86" : style === "corner" ? "#2b6848" : "#efe8dc";
  const hw = w / 2;
  const hd = d / 2;
  const count = Math.max(3, Math.round(w / 3.5));
  const columns = Array.from({ length: count }, (_, index) => -hw + 0.45 + (index * (w - 0.9)) / (count - 1));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 0.7, 0.16, d + 0.85]} />
        <meshStandardMaterial color={STONE} roughness={0.84} />
      </mesh>
      <mesh position={[0, h * 0.46, 0.12]}>
        <boxGeometry args={[w - 0.8, h * 0.78, d - 0.85]} />
        <meshStandardMaterial color={INTERIOR} roughness={0.92} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (hw - 0.12), h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.24, h, d]} />
          <meshStandardMaterial color={FRAME} roughness={0.68} />
        </mesh>
      ))}
      <mesh position={[0, h / 2, hd - 0.12]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.24]} />
        <meshStandardMaterial color={FRAME} roughness={0.7} />
      </mesh>
      <mesh position={[0, h * 0.5, -hd + 0.14]} castShadow>
        <boxGeometry args={[w - 0.55, h * 0.7, 0.06]} />
        <meshStandardMaterial color={GLASS} roughness={0.14} metalness={0.64} envMapIntensity={0.85} />
      </mesh>
      {columns.map((column) => (
        <mesh key={column} position={[column, h * 0.5, -hd + 0.2]} castShadow>
          <boxGeometry args={[0.1, h * 0.76, 0.14]} />
          <meshStandardMaterial color={FRAME} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, -hd + 0.2]} receiveShadow>
        <boxGeometry args={[w - 0.4, 0.55, 0.16]} />
        <meshStandardMaterial color={style === "retail" ? "#cfc6b8" : FRAME} roughness={0.72} />
      </mesh>
      {style === "retail" ? (
        <mesh position={[0, h * 0.74, -hd + 0.18]}>
          <boxGeometry args={[w - 0.6, h * 0.18, 0.08]} />
          <meshStandardMaterial color="#c5d7e0" roughness={0.18} metalness={0.55} />
        </mesh>
      ) : null}
      <mesh position={[0, h - 0.02, 0]}>
        <boxGeometry args={[w + 0.9, 0.08, d + 1.15]} />
        <meshStandardMaterial color="#cbb892" roughness={0.78} />
      </mesh>
      <mesh position={[0, h + 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 1.25, 0.18, d + 1.45]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.58} />
      </mesh>
      <mesh position={[0, style === "retail" ? 3.35 : 3.15, -hd - (style === "retail" ? 0.5 : 0.72)]} castShadow>
        <boxGeometry args={[style === "retail" ? w * 0.7 : w + 0.2, 0.06, style === "retail" ? 1.15 : 1.55]} />
        <meshStandardMaterial color={accent} roughness={0.55} metalness={style === "corner" ? 0.25 : 0.05} />
      </mesh>
      <mesh position={[0, 0.06, -hd - 0.5]} receiveShadow>
        <boxGeometry args={[Math.min(3.4, w * 0.42), 0.12, 0.85]} />
        <meshStandardMaterial color={STONE} roughness={0.86} />
      </mesh>
      <RigidBody type="fixed" position={[0, h / 2, 0.05]} colliders={false} friction={0.85}>
        <CuboidCollider args={[w / 2 - 0.05, h / 2, d / 2 - 0.05]} />
      </RigidBody>
    </group>
  );
}

function Canopy({ spec }: { spec: { id: string; x: number; z: number; w: number; d: number } }) {
  const posts = [
    [-spec.w / 2 + 0.35, -spec.d / 2 + 0.28],
    [spec.w / 2 - 0.35, -spec.d / 2 + 0.28],
    [-spec.w / 2 + 0.35, spec.d / 2 - 0.28],
    [spec.w / 2 - 0.35, spec.d / 2 - 0.28],
  ];
  return (
    <group position={[spec.x, 0, spec.z]}>
      {posts.map(([px, pz]) => (
        <mesh key={`${px}-${pz}`} position={[px, 1.65, pz]} castShadow>
          <boxGeometry args={[0.12, 3.3, 0.12]} />
          <meshStandardMaterial color="#ece8e0" roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 3.28, 0]}>
        <boxGeometry args={[spec.w - 0.2, 0.05, spec.d - 0.2]} />
        <meshStandardMaterial color="#d9c7a6" roughness={0.72} />
      </mesh>
      <mesh position={[0, 3.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.w, 0.08, spec.d]} />
        <meshStandardMaterial color="#f7f4ee" roughness={0.5} />
      </mesh>
      {posts.map(([px, pz]) => (
        <RigidBody key={`post-${px}-${pz}`} type="fixed" position={[px, 1.65, pz]} colliders={false}>
          <CuboidCollider args={[0.1, 1.65, 0.1]} />
        </RigidBody>
      ))}
    </group>
  );
}

function LotLines() {
  const lot = scene.surfaces.find((surface) => surface.id === "bay-lot");
  if (!lot) return null;
  const lines = Array.from({ length: 4 }, (_, index) => lot.z - lot.d / 2 + 3 + index * 4.6);
  return (
    <group>
      {lines.map((z) => (
        <mesh key={z} position={[lot.x, 0.03, z]}>
          <boxGeometry args={[lot.w - 0.7, 0.008, 0.08]} />
          <meshStandardMaterial color="#f3f0e6" roughness={0.55} />
        </mesh>
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
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  tile: number;
  maps: SurfaceMaps;
  color: string;
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
        roughness={0.88}
        metalness={0.02}
      />
    </mesh>
  );
}
