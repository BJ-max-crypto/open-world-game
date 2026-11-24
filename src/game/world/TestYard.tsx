"use client";

import { Grid } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

interface BlockProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
}

function Block({ position, size, color, rotation }: BlockProps) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid" friction={0.9}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.86} metalness={0.02} />
      </mesh>
    </RigidBody>
  );
}

/** A flat yard with a few solid buildings, a curb, a ramp, and a crate. */
export function TestYard() {
  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.5, 0]} colliders="cuboid" friction={1}>
        <mesh receiveShadow>
          <boxGeometry args={[80, 1, 80]} />
          <meshStandardMaterial color="#232a33" roughness={1} />
        </mesh>
      </RigidBody>
      <Grid
        args={[80, 80]}
        position={[0, 0.012, 0]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#3d4754"
        sectionSize={5}
        sectionThickness={1.15}
        sectionColor="#6ea39b"
        fadeDistance={48}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
      <Block position={[-7, 3, -1]} size={[4.5, 6, 4.5]} color="#3c4654" />
      <Block position={[8, 4, -3]} size={[5, 8, 5]} color="#2f3844" />
      <Block position={[0, 2.6, -12]} size={[9, 5.2, 4]} color="#4a4038" />
      <Block position={[5.5, 1.25, 3.5]} size={[0.45, 2.5, 6]} color="#343c48" />
      <Block position={[2.2, 0.14, 2.2]} size={[2.4, 0.28, 2.2]} color="#3e4a46" />
      <Block position={[-6.5, 0.55, 4.5]} size={[5.5, 0.28, 2.2]} rotation={[0, 0.35, -0.42]} color="#7fbfb6" />
      <RigidBody position={[-1.6, 0.55, 1.4]} colliders="cuboid" friction={0.85} restitution={0.02} linearDamping={0.4}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial color="#d46a4f" roughness={0.7} />
        </mesh>
      </RigidBody>
    </group>
  );
}
