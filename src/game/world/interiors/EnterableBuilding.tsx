"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { marinaPieces } from "@/game/world/interiors/marinaOffice";

/** One hollow building. The player walks through the door; nothing teleports them. */
export function MarinaOfficeInterior() {
  const pieces = marinaPieces();
  const desk = pieces.find((piece) => piece.id === "desk");
  return (
    <group>
      {pieces.map((piece) =>
        piece.collision ? (
          <RigidBody key={piece.id} type="fixed" position={[piece.x, piece.y, piece.z]} colliders={false} friction={0.95}>
            <CuboidCollider args={[piece.w / 2, piece.h / 2, piece.d / 2]} />
            <mesh castShadow receiveShadow>
              <boxGeometry args={[piece.w, piece.h, piece.d]} />
              <meshStandardMaterial color={piece.color} roughness={0.86} metalness={0.02} />
            </mesh>
          </RigidBody>
        ) : (
          <mesh key={piece.id} position={[piece.x, piece.y, piece.z]} castShadow={!piece.glass} receiveShadow>
            <boxGeometry args={[piece.w, piece.h, piece.d]} />
            <meshStandardMaterial
              color={piece.color}
              roughness={piece.glass ? 0.08 : 0.9}
              metalness={piece.glass ? 0.15 : 0}
              transparent={piece.glass}
              opacity={piece.glass ? 0.38 : 1}
            />
          </mesh>
        ),
      )}
      {desk ? <pointLight position={[desk.x, 2.55, desk.z + 1.4]} intensity={7} distance={11} color="#ffd2a8" /> : null}
      <pointLight position={[-28, 2.7, 2.6]} intensity={5} distance={9} color="#f0e2cc" />
    </group>
  );
}
