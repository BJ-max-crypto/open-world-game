"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  NoColorSpace,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Sphere,
  Vector3,
  type Texture,
} from "three";
import {
  BENCHES,
  BEDS,
  FRONT_PALMS,
  LAMPS,
  PATH_LIGHTS,
  ROCKS,
  SEATS,
  SHRUBS,
  SIGNALS,
  TUFTS,
  harborLayout,
} from "@/game/world/solara/harbor-front";

const BOUNDS = new Sphere(new Vector3(0, 1, -34), 70);
const TINTS = [new Color("#2f6a3c"), new Color("#4d7d46"), new Color("#7a4038")];

/**
 * The harbor street in front of Solara, and the entrance plaza it meets.
 * Other downtown streets are left as they are.
 */
export function HarborFront() {
  const layout = useMemo(() => harborLayout(), []);
  const field = useMemo(() => layout.pavers.filter((piece) => piece.kind === "paver"), [layout]);
  const runner = useMemo(() => layout.pavers.filter((piece) => piece.kind === "runner"), [layout]);
  const concrete = useSurface("/textures/concrete");
  return (
    <group>
      {layout.mortar.map((piece, index) => (
        <Slab key={`mortar-${index}`} piece={piece} color="#b5a48c" />
      ))}
      <Instances pieces={field} color="#e4d2b6" maps={concrete} />
      <Instances pieces={runner} color="#dcc49a" maps={concrete} />
      <Instances pieces={layout.sidewalk} color="#c8c2b4" maps={concrete} />
      {layout.curbs.map((piece, index) => (
        <mesh key={`curb-${index}`} position={[piece.x, piece.y, piece.z]} castShadow receiveShadow>
          <boxGeometry args={[piece.w, piece.h, piece.d]} />
          <meshStandardMaterial color="#d9d3c8" roughness={0.84} />
        </mesh>
      ))}
      {layout.ramps.map((piece, index) => (
        <Slab key={`ramp-${index}`} piece={piece} color={piece.kind === "apron" ? "#ddd4c6" : "#d2c9bb"} />
      ))}
      {layout.gutters.map((piece, index) => (
        <Slab key={`gutter-${index}`} piece={piece} color="#2e343a" />
      ))}
      {layout.beds.map((bed, index) => (
        <group key={`bed-${index}`}>
          <mesh position={[bed.x, bed.y, bed.z]} receiveShadow>
            <boxGeometry args={[bed.w, bed.h, bed.d]} />
            <meshStandardMaterial color="#5c4636" roughness={1} />
          </mesh>
          <BedWall bed={bed} />
        </group>
      ))}
      {TUFTS.map((tuft) => (
        <mesh key={`${tuft.x}-${tuft.z}`} position={[tuft.x, 0.125, tuft.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[tuft.w, tuft.d]} />
          <meshStandardMaterial color="#3e6b40" roughness={0.95} />
        </mesh>
      ))}
      <Shrubs />
      <Rocks />
      <FrontPalms />
      <Lamps />
      <Benches />
      <Seats />
      <Signals />
      <PathLights />
      <mesh position={[-42.2, 0.52, -44.3]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.84, 10]} />
        <meshStandardMaterial color="#2c3238" roughness={0.55} metalness={0.25} />
      </mesh>
      <BikeRack />
    </group>
  );
}

function BedWall({ bed }: { bed: { x: number; z: number; w: number; d: number } }) {
  const h = 0.16;
  const y = 0.16;
  const edges = [
    { x: bed.x, z: bed.z - bed.d / 2, w: bed.w, d: 0.1 },
    { x: bed.x, z: bed.z + bed.d / 2, w: bed.w, d: 0.1 },
    { x: bed.x - bed.w / 2, z: bed.z, w: 0.1, d: bed.d },
    { x: bed.x + bed.w / 2, z: bed.z, w: 0.1, d: bed.d },
  ];
  return (
    <group>
      {edges.map((edge) => (
        <mesh key={`${edge.x}-${edge.z}-${edge.w}`} position={[edge.x, y, edge.z]} castShadow receiveShadow>
          <boxGeometry args={[edge.w, h, edge.d]} />
          <meshStandardMaterial color="#d7d1c6" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Slab({
  piece,
  color,
}: {
  piece: { x: number; z: number; w: number; d: number; y: number; h: number };
  color: string;
}) {
  return (
    <mesh position={[piece.x, piece.y, piece.z]} receiveShadow>
      <boxGeometry args={[piece.w, piece.h, piece.d]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Instances({
  pieces,
  color,
  maps,
}: {
  pieces: { x: number; z: number; w: number; d: number; y: number; h: number }[];
  color: string;
  maps: SurfaceMaps;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const mesh = ref.current;
    if (!mesh) return;
    pieces.forEach((piece, index) => {
      dummy.position.set(piece.x, piece.y, piece.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(piece.w, piece.h, piece.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = BOUNDS;
  }, [pieces]);
  if (pieces.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pieces.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} map={maps.map} roughnessMap={maps.roughnessMap} roughness={0.84} />
    </instancedMesh>
  );
}

function Shrubs() {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const mesh = ref.current;
    if (!mesh) return;
    SHRUBS.forEach((shrub, index) => {
      dummy.position.set(shrub.x, 0.18 + shrub.s * 0.28, shrub.z);
      dummy.rotation.set(0, index, 0);
      dummy.scale.set(shrub.s, shrub.s * 0.7, shrub.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, TINTS[shrub.tint] ?? TINTS[0]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.boundingSphere = BOUNDS;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, SHRUBS.length]} castShadow>
      <sphereGeometry args={[0.45, 7, 5]} />
      <meshStandardMaterial color="#ffffff" roughness={0.86} />
    </instancedMesh>
  );
}

function Rocks() {
  return (
    <group>
      {ROCKS.map((rock) => (
        <mesh key={`${rock.x}-${rock.z}`} position={[rock.x, 0.16, rock.z]} rotation={[0, rock.yaw, 0]} castShadow>
          <boxGeometry args={[rock.w, 0.16, rock.d]} />
          <meshStandardMaterial color="#9a9288" roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}

function FrontPalms() {
  const trunkRef = useRef<InstancedMesh>(null);
  const crownRef = useRef<InstancedMesh>(null);
  const trunk = 5.4;
  const frondGeo = useMemo(() => {
    const geometry = new PlaneGeometry(0.42, 1.7);
    geometry.translate(0, 0.7, 0);
    geometry.rotateZ(0.95);
    return geometry;
  }, []);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const trunks = trunkRef.current;
    const crowns = crownRef.current;
    if (!trunks || !crowns) return;
    FRONT_PALMS.forEach((palm, index) => {
      dummy.position.set(palm.x, (trunk / 2) * palm.s, palm.z);
      dummy.rotation.set(0, palm.yaw, 0);
      dummy.scale.setScalar(palm.s);
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);
      for (let blade = 0; blade < 7; blade += 1) {
        dummy.position.set(palm.x, trunk * palm.s * 0.9, palm.z);
        dummy.rotation.set(0, palm.yaw + (blade / 7) * Math.PI * 2, 0);
        dummy.scale.setScalar(palm.s);
        dummy.updateMatrix();
        crowns.setMatrixAt(index * 7 + blade, dummy.matrix);
      }
    });
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    trunks.boundingSphere = BOUNDS;
    crowns.boundingSphere = BOUNDS;
  }, []);
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, FRONT_PALMS.length]} castShadow>
        <cylinderGeometry args={[0.11, 0.18, trunk, 6]} />
        <meshStandardMaterial color="#8d7358" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[frondGeo, undefined, FRONT_PALMS.length * 7]} castShadow>
        <meshStandardMaterial color="#2a7040" roughness={0.74} side={DoubleSide} />
      </instancedMesh>
    </group>
  );
}

function Lamps() {
  const pole = useMemo(() => new CylinderGeometry(0.06, 0.08, 4.4, 6), []);
  const poleRef = useRef<InstancedMesh>(null);
  const headRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const poles = poleRef.current;
    const heads = headRef.current;
    if (!poles || !heads) return;
    LAMPS.forEach((lamp, index) => {
      dummy.position.set(lamp.x, 2.28, lamp.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(index, dummy.matrix);
      dummy.position.set(lamp.x, 4.52, lamp.z);
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
      <instancedMesh ref={poleRef} args={[pole, undefined, LAMPS.length]} castShadow>
        <meshStandardMaterial color="#d5d8dc" roughness={0.4} metalness={0.45} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, LAMPS.length]}>
        <boxGeometry args={[0.7, 0.08, 0.28]} />
        <meshStandardMaterial color="#fff1cc" emissive="#ffe2a4" emissiveIntensity={0.4} roughness={0.35} />
      </instancedMesh>
    </group>
  );
}

function Benches() {
  const legs = [
    [-0.62, 0.16],
    [0.62, 0.16],
    [-0.62, -0.16],
    [0.62, -0.16],
  ];
  return (
    <group>
      {BENCHES.map((bench) => (
        <group key={`${bench.x}`} position={[bench.x, 0, bench.z]} rotation={[0, bench.yaw, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow>
            <boxGeometry args={[1.5, 0.08, 0.46]} />
            <meshStandardMaterial color="#c8b8a2" roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.7, -0.2]} castShadow>
            <boxGeometry args={[1.5, 0.36, 0.06]} />
            <meshStandardMaterial color="#b7a890" roughness={0.8} />
          </mesh>
          {legs.map(([x, z]) => (
            <mesh key={`${x}-${z}`} position={[x, 0.28, z]} castShadow>
              <boxGeometry args={[0.06, 0.36, 0.06]} />
              <meshStandardMaterial color="#6e6458" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      <SidewalkBenchLegs />
    </group>
  );
}

/** Legs for the two benches already placed on this sidewalk by the streetscape. */
function SidewalkBenchLegs() {
  const spots = [
    { x: -14, z: -42.4, yaw: 0 },
    { x: 14, z: -42.2, yaw: 0.05 },
  ];
  const legs = [
    [-0.6, 0.15],
    [0.6, 0.15],
    [-0.6, -0.15],
    [0.6, -0.15],
  ];
  return (
    <group>
      {spots.map((spot) => (
        <group key={spot.x} position={[spot.x, 0, spot.z]} rotation={[0, spot.yaw, 0]}>
          {legs.map(([x, z]) => (
            <mesh key={`${x}-${z}`} position={[x, 0.26, z]}>
              <boxGeometry args={[0.06, 0.32, 0.06]} />
              <meshStandardMaterial color="#6e6458" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Seats() {
  return (
    <group>
      {SEATS.map((seat) => (
        <group key={`${seat.x}`} position={[seat.x, 0, seat.z]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.05, 12]} />
            <meshStandardMaterial color="#f4f0e8" roughness={0.58} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.68, 8]} />
            <meshStandardMaterial color="#b7aa98" roughness={0.7} />
          </mesh>
          {[-0.7, 0.7].map((offset) => (
            <group key={offset} position={[0, 0, offset]}>
              <mesh position={[0, 0.46, 0]} castShadow>
                <boxGeometry args={[0.38, 0.05, 0.38]} />
                <meshStandardMaterial color="#d5cfc3" roughness={0.72} />
              </mesh>
              {[
                [-0.14, -0.14],
                [0.14, -0.14],
                [-0.14, 0.14],
                [0.14, 0.14],
              ].map(([x, z]) => (
                <mesh key={`${x}-${z}`} position={[x, 0.26, z]}>
                  <boxGeometry args={[0.04, 0.34, 0.04]} />
                  <meshStandardMaterial color="#b7aa98" roughness={0.7} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function Signals() {
  return (
    <group>
      {SIGNALS.map((signal) => (
        <group key={signal.x} position={[signal.x, 0, signal.z]}>
          <mesh position={[0, 1.9, 0]} castShadow>
            <boxGeometry args={[0.12, 3.8, 0.12]} />
            <meshStandardMaterial color="#3a4148" roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh position={[signal.x > 0 ? -0.9 : 0.9, 3.55, 0]} castShadow>
            <boxGeometry args={[1.8, 0.08, 0.08]} />
            <meshStandardMaterial color="#3a4148" roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh position={[signal.x > 0 ? -1.7 : 1.7, 3.28, 0]}>
            <boxGeometry args={[0.28, 0.7, 0.32]} />
            <meshStandardMaterial color="#1c2126" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[signal.x > 0 ? -1.7 : 1.7, 3.42, 0.17]}>
            <boxGeometry args={[0.12, 0.12, 0.04]} />
            <meshStandardMaterial color="#c4533a" emissive="#a33b28" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PathLights() {
  return (
    <group>
      {PATH_LIGHTS.map((light) => (
        <group key={`${light.x}-${light.z}`} position={[light.x, 0, light.z]}>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 0.5, 6]} />
            <meshStandardMaterial color="#d9d4cc" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.56, 0]}>
            <cylinderGeometry args={[0.1, 0.08, 0.08, 8]} />
            <meshStandardMaterial color="#fff1cc" emissive="#ffe2a4" emissiveIntensity={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BikeRack() {
  return (
    <group position={[41.6, 0, -44.25]}>
      {[ -0.28, 0.28 ].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[-0.22, 0.38, 0]} castShadow>
            <boxGeometry args={[0.05, 0.7, 0.05]} />
            <meshStandardMaterial color="#8d939a" roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[0.22, 0.38, 0]} castShadow>
            <boxGeometry args={[0.05, 0.7, 0.05]} />
            <meshStandardMaterial color="#8d939a" roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.5, 0.05, 0.05]} />
            <meshStandardMaterial color="#8d939a" roughness={0.4} metalness={0.55} />
          </mesh>
        </group>
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
