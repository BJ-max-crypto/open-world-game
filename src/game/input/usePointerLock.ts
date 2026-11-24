"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FOUNDATION } from "@/game/config/foundation";

export interface LookState {
  yaw: number;
  pitch: number;
}

/**
 * Pointer lock starts only after a click. Escape (browser default) or leaving
 * the tab releases it. Look deltas stay in a ref for the frame loop.
 */
export function usePointerLock(targetRef: RefObject<HTMLCanvasElement | null>): {
  locked: boolean;
  look: RefObject<LookState>;
  request: () => void;
} {
  const look = useRef<LookState>({ yaw: FOUNDATION.initialYaw, pitch: FOUNDATION.initialPitch });
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== targetRef.current) return;
      const next = look.current;
      next.yaw -= event.movementX * FOUNDATION.lookSensitivity;
      next.pitch += event.movementY * FOUNDATION.lookSensitivity;
      if (next.pitch < FOUNDATION.pitchMin) next.pitch = FOUNDATION.pitchMin;
      if (next.pitch > FOUNDATION.pitchMax) next.pitch = FOUNDATION.pitchMax;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") document.exitPointerLock();
    };
    const onChange = () => {
      setLocked(document.pointerLockElement === targetRef.current);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerlockchange", onChange);
    document.addEventListener("pointerlockerror", onChange);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerlockchange", onChange);
      document.removeEventListener("pointerlockerror", onChange);
      if (document.pointerLockElement === targetRef.current) document.exitPointerLock();
    };
  }, [targetRef]);

  const request = () => {
    const canvas = targetRef.current;
    if (!canvas) return;
    if (document.pointerLockElement === canvas) return;
    void canvas.requestPointerLock();
  };

  return { locked, look, request };
}
