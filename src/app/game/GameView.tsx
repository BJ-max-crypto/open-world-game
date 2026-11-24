"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ControlGuide } from "@/components/Controls/ControlGuide";
import { CoastHud } from "@/components/HUD/CoastHud";
import { MissionPanel } from "@/components/HUD/MissionPanel";
import { useKeyState } from "@/game/input/useKeyState";
import { usePointerLock } from "@/game/input/usePointerLock";
import { FoundationScene } from "@/game/render/FoundationScene";
import { CoastSession, type CoastSnapshot, type SessionChange } from "@/game/session/CoastSession";
import { readCoastSave, writeCoastSave } from "@/game/session/coastSave";
import { restoreProfile } from "@/services/PlayerService";

export function GameView() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useKeyState();
  const { locked, look, request } = usePointerLock(canvasRef);
  const haltRef = useRef(false);
  const sessionRef = useRef<CoastSession | null>(null);
  const profileId = useRef<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [snap, setSnap] = useState<CoastSnapshot | null>(null);
  const markReady = useCallback(() => setReady(true), []);

  const publish = useCallback((persist: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    haltRef.current = session.suspended;
    const next = session.snapshot();
    setSnap(next);
    if (persist && profileId.current) writeCoastSave(profileId.current, session.toSave());
    if (!next.notice) return;
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => {
      if (!sessionRef.current) return;
      sessionRef.current.notice = null;
      haltRef.current = sessionRef.current.suspended;
      setSnap(sessionRef.current.snapshot());
    }, 4200);
  }, []);

  useEffect(() => {
    let dead = false;
    void restoreProfile().then((profile) => {
      if (dead) return;
      if (!profile) {
        router.replace("/login");
        return;
      }
      profileId.current = profile.id;
      const session = new CoastSession(readCoastSave(profile.id));
      sessionRef.current = session;
      haltRef.current = session.suspended;
      setSnap(session.snapshot());
      setAllowed(true);
    });
    return () => {
      dead = true;
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, [router]);

  useEffect(() => {
    if (snap?.panel) document.exitPointerLock();
  }, [snap?.panel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Escape" || !sessionRef.current?.panel) return;
      sessionRef.current.dismiss();
      publish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [publish]);

  const onSession = useCallback(
    (kind: SessionChange) => {
      publish(kind === "save");
    },
    [publish],
  );

  const accept = useCallback(() => {
    if (!sessionRef.current?.accept()) return;
    publish(true);
  }, [publish]);

  const dismiss = useCallback(() => {
    sessionRef.current?.dismiss();
    publish(false);
  }, [publish]);

  if (!allowed || !snap) {
    return (
      <main className="nl-stage">
        <div className="nl-boot">Opening the waterfront…</div>
      </main>
    );
  }

  return (
    <main className="nl-stage">
      <FoundationScene
        look={look}
        keys={keys}
        canvasRef={canvasRef}
        sessionRef={sessionRef}
        haltRef={haltRef}
        collectedIds={snap.collectedIds}
        waypoint={snap.waypoint}
        onReady={markReady}
        onSession={onSession}
      />
      {!ready ? <div className="nl-boot">Opening the waterfront…</div> : null}
      {ready && !locked && !snap.panel ? (
        <button type="button" className="nl-look-gate" onClick={request}>
          <strong>Click to look</strong>
          <span>Esc releases the mouse</span>
        </button>
      ) : null}
      <CoastHud snap={snap} />
      <ControlGuide />
      {snap.panel ? (
        <MissionPanel panel={snap.panel} body={snap.panelBody} onAccept={accept} onDismiss={dismiss} />
      ) : null}
    </main>
  );
}
