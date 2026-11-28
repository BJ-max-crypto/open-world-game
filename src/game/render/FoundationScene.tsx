"use client";

import { Suspense, useEffect, useRef, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Sky } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { ThirdPersonCamera } from "@/game/camera/ThirdPersonCamera";
import { FOUNDATION } from "@/game/config/foundation";
import type { KeyState } from "@/game/input/useKeyState";
import type { LookState } from "@/game/input/usePointerLock";
import { ThirdPersonPlayer } from "@/game/player/ThirdPersonPlayer";
import type { PlayerPose } from "@/game/player/pose";
import type { KayakSeat } from "@/game/world/life/kayak";
import { DowntownBlock } from "@/game/world/solara/DowntownBlock";
import { PhaseOne } from "@/game/world/solara/PhaseOne";
import { SolaraSite } from "@/game/world/solara/SolaraSite";
import { Streetscape } from "@/game/world/solara/Streetscape";

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
  haltRef: RefObject<boolean>;
  pose: RefObject<PlayerPose>;
  onReady: () => void;
}

/**
 * Active scene for the Solara Tower study.
 * The marina district, traffic, boats, and mission director stay in the repo and are not mounted.
 */
export function FoundationScene({ look, keys, canvasRef, haltRef, pose, onReady }: FoundationSceneProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const paddleRef = useRef(false);
  const seatRef = useRef<KayakSeat | null>(null);
  const dismountRef = useRef<{ x: number; y: number; z: number } | null>(null);

  return (
    <Canvas
      className="nl-canvas"
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 42, near: 0.12, far: 900, position: [0, 6, -48] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        canvasRef.current = gl.domElement;
      }}
    >
      <color attach="background" args={["#9ec8ea"]} />
      <fog attach="fog" args={["#c5d7e8", 140, 620]} />
      <Suspense fallback={null}>
        <Sky sunPosition={[40, 28, -18]} turbidity={3.2} rayleigh={0.85} mieCoefficient={0.004} mieDirectionalG={0.72} />
        <Environment files="/textures/sky/kloppenheim_1k.hdr" background={false} environmentIntensity={0.72} />
        <Physics gravity={[0, FOUNDATION.gravity, 0]} timeStep={1 / 60}>
          <hemisphereLight args={["#d7e7f6", "#c8bfb2", 0.42]} />
          <ambientLight intensity={0.12} />
          <directionalLight
            position={[36, 92, -48]}
            intensity={2.35}
            color="#fff1dd"
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-near={10}
            shadow-camera-far={520}
            shadow-camera-left={-220}
            shadow-camera-right={220}
            shadow-camera-top={220}
            shadow-camera-bottom={-220}
            shadow-bias={-0.00025}
            shadow-normalBias={0.06}
          />
          <directionalLight position={[-24, 18, 30]} intensity={0.22} color="#b7c9dc" />
          {/* Ground lives here so a late model suspend cannot spawn it under a falling player. */}
          <RigidBody type="fixed" position={[0, -0.5, 0]} colliders={false} friction={1}>
            <CuboidCollider args={[200, 0.5, 200]} />
          </RigidBody>
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
          <Suspense fallback={null}>
            <SolaraSite />
            <DowntownBlock />
            <PhaseOne />
            <Streetscape />
            <MarkReady onReady={onReady} />
          </Suspense>
        </Physics>
      </Suspense>
    </Canvas>
  );
}
