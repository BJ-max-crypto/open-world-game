"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Vector3 } from "three";
import { FOUNDATION } from "@/game/config/foundation";
import type { LookState } from "@/game/input/usePointerLock";
import { cameraClearance, cameraOffset } from "@/game/player/movement";

interface ThirdPersonCameraProps {
  bodyRef: RefObject<RapierRigidBody | null>;
  look: RefObject<LookState | null>;
}

export function ThirdPersonCamera({ bodyRef, look }: ThirdPersonCameraProps) {
  const camera = useThree((state) => state.camera);
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);
  const desired = useRef(new Vector3());
  const raised = useRef(new Vector3());
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
    const shift = 0.4;
    if (length > 1e-4) {
      ray.dir.x = offset.x / length;
      ray.dir.y = offset.y / length;
      ray.dir.z = offset.z / length;
      ray.origin.x = pos.x - ray.dir.x * shift;
      ray.origin.y = eyeY - ray.dir.y * shift;
      ray.origin.z = pos.z - ray.dir.z * shift;
      const hit = world.castRay(ray, length + shift, true, undefined, undefined, undefined, body);
      const clearance = cameraClearance(
        length,
        hit ? hit.timeOfImpact : null,
        shift,
        FOUNDATION.cameraPadding,
        FOUNDATION.cameraMinDistance,
      );
      const originX = clearance.origin === "eye" ? pos.x : ray.origin.x;
      const originY = clearance.origin === "eye" ? eyeY : ray.origin.y;
      const originZ = clearance.origin === "eye" ? pos.z : ray.origin.z;
      const boomPoint = {
        x: originX + ray.dir.x * clearance.along,
        y: originY + ray.dir.y * clearance.along,
        z: originZ + ray.dir.z * clearance.along,
      };
      const boom = Math.hypot(boomPoint.x - pos.x, boomPoint.y - eyeY, boomPoint.z - pos.z);
      if (boom >= 1.25) {
        desired.current.set(boomPoint.x, boomPoint.y, boomPoint.z);
      } else {
        const camX = offset.x / length;
        const camZ = offset.z / length;
        let bestTravel = -1;
        for (const sign of [1, -1] as const) {
          const fromY = eyeY + 0.2;
          const toX = pos.x - camZ * sign * 0.8;
          const toY = eyeY + 1.25;
          const toZ = pos.z + camX * sign * 0.8;
          const dx = toX - pos.x;
          const dy = toY - fromY;
          const dz = toZ - pos.z;
          const span = Math.hypot(dx, dy, dz) || 1;
          ray.origin.x = pos.x;
          ray.origin.y = fromY;
          ray.origin.z = pos.z;
          ray.dir.x = dx / span;
          ray.dir.y = dy / span;
          ray.dir.z = dz / span;
          const shoulderHit = world.castRay(ray, span, true, undefined, undefined, undefined, body);
          const travel = shoulderHit ? Math.max(0.2, Math.min(span, shoulderHit.timeOfImpact - 0.12)) : span;
          if (travel > bestTravel) {
            bestTravel = travel;
            raised.current.set(pos.x + ray.dir.x * travel, fromY + ray.dir.y * travel, pos.z + ray.dir.z * travel);
          }
        }
        desired.current.copy(raised.current);
      }
    } else {
      desired.current.set(pos.x, eyeY, pos.z);
    }
    if (!hasSmoothed.current) {
      smoothed.current.copy(desired.current);
      hasSmoothed.current = true;
    }
    lookTarget.current.set(pos.x, eyeY, pos.z);
    const alpha = 1 - Math.exp(-FOUNDATION.cameraSharpness * Math.min(delta, 1 / 30));
    const smoothedBoom = smoothed.current.distanceTo(lookTarget.current);
    const desiredBoom = desired.current.distanceTo(lookTarget.current);
    if (desiredBoom + 0.35 < smoothedBoom) smoothed.current.copy(desired.current);
    else smoothed.current.lerp(desired.current, alpha);
    camera.position.copy(smoothed.current);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
