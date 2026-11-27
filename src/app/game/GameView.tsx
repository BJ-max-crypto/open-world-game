"use client";

import { useCallback, useRef, useState } from "react";
import { ControlGuide } from "@/components/Controls/ControlGuide";
import { useKeyState } from "@/game/input/useKeyState";
import { usePointerLock } from "@/game/input/usePointerLock";
import { createPose } from "@/game/player/pose";
import { FoundationScene } from "@/game/render/FoundationScene";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useKeyState();
  const { locked, look, request } = usePointerLock(canvasRef);
  const haltRef = useRef(false);
  const pose = useRef(createPose());
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  return (
    <main className="nl-stage">
      <FoundationScene look={look} keys={keys} canvasRef={canvasRef} haltRef={haltRef} pose={pose} onReady={markReady} />
      {!ready ? <div className="nl-boot">Opening Solara Tower…</div> : null}
      {ready && !locked ? (
        <button type="button" className="nl-look-gate" onClick={request}>
          <strong>Click to look</strong>
          <span>Esc releases the mouse</span>
        </button>
      ) : null}
      <ControlGuide />
    </main>
  );
}
