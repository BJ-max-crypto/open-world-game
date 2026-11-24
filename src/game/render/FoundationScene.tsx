"use client";

import { Suspense, useEffect, useRef, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, type RapierRigidBody } from "@react-three/rapier";
import { ThirdPersonCamera } from "@/game/camera/ThirdPersonCamera";
import { FOUNDATION } from "@/game/config/foundation";
import type { KeyState } from "@/game/input/useKeyState";
import type { LookState } from "@/game/input/usePointerLock";
import { ThirdPersonPlayer } from "@/game/player/ThirdPersonPlayer";
import { TestYard } from "@/game/world/TestYard";

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
  onReady: () => void;
}

export function FoundationScene({ look, keys, canvasRef, onReady }: FoundationSceneProps) {
  const bodyRef = useRef<RapierRigidBody>(null);

  return (
    <Canvas
      className="nl-canvas"
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 48, near: 0.08, far: 200, position: [0, 4, 16] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        canvasRef.current = gl.domElement;
      }}
    >
      <color attach="background" args={["#141a22"]} />
      <Suspense fallback={null}>
        <Physics gravity={[0, FOUNDATION.gravity, 0]}>
          <MarkReady onReady={onReady} />
          <hemisphereLight args={["#b7c4d6", "#2a241e", 0.42]} />
          <ambientLight intensity={0.22} />
          <directionalLight
            position={[16, 24, 10]}
            intensity={1.55}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={2}
            shadow-camera-far={70}
            shadow-camera-left={-28}
            shadow-camera-right={28}
            shadow-camera-top={28}
            shadow-camera-bottom={-28}
            shadow-bias={-0.00035}
          />
          <TestYard />
          <ThirdPersonPlayer bodyRef={bodyRef} look={look} keys={keys} />
          <ThirdPersonCamera bodyRef={bodyRef} look={look} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
