"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Vector3 } from "three";
import { FOUNDATION } from "@/game/config/foundation";
import type { LookState } from "@/game/input/usePointerLock";
import { cameraOffset, pullCameraIn } from "@/game/player/movement";

interface ThirdPersonCameraProps {
  bodyRef: RefObject<RapierRigidBody | null>;
  look: RefObject<LookState | null>;
}

export function ThirdPersonCamera({ bodyRef, look }: ThirdPersonCameraProps) {
  const camera = useThree((state) => state.camera);
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);
  const desired = useRef(new Vector3());
  const smoothed = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());
  const hasSmoothed = useRef(false);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const lookState = look.current;
    if (!body || !lookState) return;

    const pos = body.translation();
    const eyeY = pos.y + FOUNDATION.eye;
    const offset = cameraOffset(lookState.yaw, lookState.pitch, FOUNDATION.cameraDistance);
    const length = Math.hypot(offset.x, offset.y, offset.z);
    let boom = length;
    if (length > 1e-4) {
      ray.origin.x = pos.x;
      ray.origin.y = eyeY;
      ray.origin.z = pos.z;
      ray.dir.x = offset.x / length;
      ray.dir.y = offset.y / length;
      ray.dir.z = offset.z / length;
      const hit = world.castRay(ray, length, true, undefined, undefined, undefined, body);
      boom = pullCameraIn(length, hit ? hit.timeOfImpact : null, FOUNDATION.cameraPadding, FOUNDATION.cameraMinDistance);
    }

    desired.current.set(pos.x + ray.dir.x * boom, eyeY + ray.dir.y * boom, pos.z + ray.dir.z * boom);
    if (!hasSmoothed.current) {
      smoothed.current.copy(desired.current);
      hasSmoothed.current = true;
    }
    const alpha = 1 - Math.exp(-FOUNDATION.cameraSharpness * Math.min(delta, 1 / 30));
    smoothed.current.lerp(desired.current, alpha);
    lookTarget.current.set(pos.x, eyeY, pos.z);
    camera.position.copy(smoothed.current);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
