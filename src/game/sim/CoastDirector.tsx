"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { consumePressed, type KeyState } from "@/game/input/useKeyState";
import { CoastSession, type SessionChange } from "@/game/session/CoastSession";

interface CoastDirectorProps {
  bodyRef: RefObject<RapierRigidBody | null>;
  keys: RefObject<KeyState | null>;
  sessionRef: RefObject<CoastSession | null>;
  onChange: (kind: SessionChange) => void;
}

/** Applies E against the session. Movement stays in the player controller. */
export function CoastDirector({ bodyRef, keys, sessionRef, onChange }: CoastDirectorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useFrame(() => {
    const session = sessionRef.current;
    const body = bodyRef.current;
    const keyState = keys.current;
    if (!session || !body || !keyState) return;
    const pressed = consumePressed(keyState, "KeyE");
    const position = body.translation();
    const kind = session.tick(position.x, position.z, pressed);
    if (kind === "none") return;
    onChangeRef.current(kind);
  });

  return null;
}
