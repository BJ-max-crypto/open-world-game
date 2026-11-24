"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface KeyState {
  held: Set<string>;
  pressed: Set<string>;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function consumePressed(state: KeyState, code: string): boolean {
  if (!state.pressed.has(code)) return false;
  state.pressed.delete(code);
  return true;
}

/** Held keys live in a ref so the simulation can read them without rendering. */
export function useKeyState(): RefObject<KeyState> {
  const state = useRef<KeyState>({ held: new Set(), pressed: new Set() });

  useEffect(() => {
    const keys = state.current;
    const down = (event: KeyboardEvent) => {
      if (event.repeat || isTyping(event.target)) return;
      if (event.code === "Space") event.preventDefault();
      keys.held.add(event.code);
      keys.pressed.add(event.code);
    };
    const up = (event: KeyboardEvent) => {
      keys.held.delete(event.code);
    };
    const blur = () => {
      keys.held.clear();
      keys.pressed.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      keys.held.clear();
      keys.pressed.clear();
    };
  }, []);

  return state;
}
