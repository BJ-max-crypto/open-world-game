"use client";

import { Suspense, useEffect, useRef, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Physics, type RapierRigidBody } from "@react-three/rapier";
import { ThirdPersonCamera } from "@/game/camera/ThirdPersonCamera";
import { FOUNDATION } from "@/game/config/foundation";
import type { KeyState } from "@/game/input/useKeyState";
import type { LookState } from "@/game/input/usePointerLock";
import { ThirdPersonPlayer } from "@/game/player/ThirdPersonPlayer";
import { CoastDirector } from "@/game/sim/CoastDirector";
import type { CoastSession, SessionChange } from "@/game/session/CoastSession";
import type { PlayerPose } from "@/game/player/pose";
import { CoastDistrict } from "@/game/world/coast/CoastDistrict";
import { CityLife } from "@/game/world/life/CityLife";
import type { KayakSeat } from "@/game/world/life/kayak";

function MarkReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

interface FoundationSceneProps {
  look: RefObject<LookState | null>;
  keys: RefObject<KeyState | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sessionRef: RefObject<CoastSession | null>;
  haltRef: RefObject<boolean>;
  pose: RefObject<PlayerPose>;
  collectedIds: readonly string[];
  waypoint: { x: number; z: number } | null;
  onReady: () => void;
  onSession: (kind: SessionChange) => void;
  onKayakPrompt: (label: string | null) => void;
  paddleRef: RefObject<boolean>;
  seatRef: RefObject<KayakSeat | null>;
  dismountRef: RefObject<{ x: number; y: number; z: number } | null>;
  kayakMark: RefObject<{ x: number; z: number } | null>;
}

export function FoundationScene({
  look,
  keys,
  canvasRef,
  sessionRef,
  haltRef,
  pose,
  collectedIds,
  waypoint,
  onReady,
  onSession,
  onKayakPrompt,
  paddleRef,
  seatRef,
  dismountRef,
  kayakMark,
}: FoundationSceneProps) {
  const bodyRef = useRef<RapierRigidBody>(null);

  return (
    <Canvas
      className="nl-canvas"
      shadows
      dpr={[1, 1.6]}
      camera={{ fov: 46, near: 0.08, far: 260, position: [-6, 4, -26] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        canvasRef.current = gl.domElement;
      }}
    >
      <color attach="background" args={["#c4a48c"]} />
      <fog attach="fog" args={["#d2b39a", 36, 130]} />
      <Suspense fallback={null}>
        <Sky sunPosition={[-55, 7, -28]} turbidity={8} rayleigh={1.8} mieCoefficient={0.006} mieDirectionalG={0.82} />
        <Physics gravity={[0, FOUNDATION.gravity, 0]} timeStep={1 / 60}>
          <MarkReady onReady={onReady} />
          <hemisphereLight args={["#f0c9a0", "#3a342c", 0.38]} />
          <ambientLight intensity={0.16} />
          <directionalLight
            position={[-28, 18, -16]}
            intensity={1.85}
            color="#ffc48a"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={2}
            shadow-camera-far={120}
            shadow-camera-left={-55}
            shadow-camera-right={55}
            shadow-camera-top={55}
            shadow-camera-bottom={-55}
            shadow-bias={-0.0004}
            shadow-normalBias={0.04}
          />
          <directionalLight position={[18, 10, 24]} intensity={0.28} color="#9eb4c9" />
          <CoastDistrict collectedIds={collectedIds} waypoint={waypoint} />
          <CityLife
            pose={pose}
            keys={keys}
            bodyRef={bodyRef}
            haltRef={haltRef}
            paddleRef={paddleRef}
            seatRef={seatRef}
            dismountRef={dismountRef}
            markRef={kayakMark}
            onKayakPrompt={onKayakPrompt}
          />
          <ThirdPersonPlayer
            bodyRef={bodyRef}
            look={look}
            keys={keys}
            haltRef={haltRef}
            paddleRef={paddleRef}
            seatRef={seatRef}
            dismountRef={dismountRef}
            pose={pose}
          />
          <ThirdPersonCamera bodyRef={bodyRef} look={look} />
          <CoastDirector bodyRef={bodyRef} keys={keys} sessionRef={sessionRef} onChange={onSession} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
