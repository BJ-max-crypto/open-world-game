"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ControlGuide } from "@/components/Controls/ControlGuide";
import { useKeyState } from "@/game/input/useKeyState";
import { usePointerLock } from "@/game/input/usePointerLock";
import { FoundationScene } from "@/game/render/FoundationScene";
import { restoreProfile } from "@/services/PlayerService";

export function GameView() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useKeyState();
  const { locked, look, request } = usePointerLock(canvasRef);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    let dead = false;
    void restoreProfile().then((profile) => {
      if (dead) return;
      if (!profile) router.replace("/login");
      else setAllowed(true);
    });
    return () => {
      dead = true;
    };
  }, [router]);

  if (!allowed) {
    return (
      <main className="nl-stage">
        <div className="nl-boot">Opening the district…</div>
      </main>
    );
  }

  return (
    <main className="nl-stage">
      <FoundationScene look={look} keys={keys} canvasRef={canvasRef} onReady={markReady} />
      {!ready ? <div className="nl-boot">Opening the district…</div> : null}
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
