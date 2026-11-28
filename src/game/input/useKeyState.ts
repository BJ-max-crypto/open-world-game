"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { MoveInput } from "@/game/player/movement";

export interface KeyState {
  held: Set<string>;
  pressed: Set<string>;
  /** Wall-clock timestamps of Space keydowns since the last read. Temporary lift gesture. */
  spaceTaps: number[];
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

/**
 * Temporary lift gesture. Two Space taps inside `windowMs` are a double-tap.
 * Taps that arrived in earlier frames count through `previousTap`.
 */
export function takeSpaceGesture(
  taps: number[],
  previousTap: number,
  windowMs: number,
): { double: boolean; previousTap: number } {
  let previous = previousTap;
  let double = false;
  for (const tap of taps) {
    if (previous > 0 && tap - previous <= windowMs) double = true;
    previous = tap;
  }
  return { double, previousTap: taps.length > 0 ? previous : previousTap };
}

/** Arrow keys are the movement set. Letter keys do not walk. */
export function movementInput(held: { has(code: string): boolean }): MoveInput {
  return {
    forward: held.has("ArrowUp"),
    back: held.has("ArrowDown"),
    left: held.has("ArrowLeft"),
    right: held.has("ArrowRight"),
  };
}

function blocksPageScroll(code: string): boolean {
  return code === "Space" || code.startsWith("Arrow");
}

/** Held keys live in a ref so the simulation can read them without rendering. */
export function useKeyState(): RefObject<KeyState> {
  const state = useRef<KeyState>({ held: new Set(), pressed: new Set(), spaceTaps: [] });

  useEffect(() => {
    const keys = state.current;
    const down = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (blocksPageScroll(event.code)) event.preventDefault();
      if (event.repeat) return;
      keys.held.add(event.code);
      keys.pressed.add(event.code);
      if (event.code === "Space") keys.spaceTaps.push(event.timeStamp);
    };
    const up = (event: KeyboardEvent) => {
      keys.held.delete(event.code);
    };
    const blur = () => {
      keys.held.clear();
      keys.pressed.clear();
      keys.spaceTaps.length = 0;
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
