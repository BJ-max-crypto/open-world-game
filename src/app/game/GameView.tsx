"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ControlGuide } from "@/components/Controls/ControlGuide";
import { CoastHud } from "@/components/HUD/CoastHud";
import { MiniMap } from "@/components/HUD/DistrictMiniMap";
import { MissionPanel } from "@/components/HUD/MissionPanel";
import { WorldMap } from "@/components/HUD/WorldMap";
import { useKeyState } from "@/game/input/useKeyState";
import { usePointerLock } from "@/game/input/usePointerLock";
import { createPose } from "@/game/player/pose";
import { FoundationScene } from "@/game/render/FoundationScene";
import { CoastSession, type CoastSnapshot, type SessionChange } from "@/game/session/CoastSession";
import { readCoastSave, writeCoastSave } from "@/game/session/coastSave";
import { readStoredProfile } from "@/services/PlayerService";

const LOCAL_PLAYER = "local";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useKeyState();
  const { locked, look, request } = usePointerLock(canvasRef);
  const haltRef = useRef(false);
  const mapOpenRef = useRef(false);
  const pose = useRef(createPose());
  const pin = useRef<{ x: number; z: number } | null>(null);
  const sessionRef = useRef<CoastSession | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const profileId = useRef<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [snap, setSnap] = useState<CoastSnapshot | null>(null);
  const markReady = useCallback(() => setReady(true), []);

  const publish = useCallback((persist: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    haltRef.current = session.suspended || mapOpenRef.current;
    const next = session.snapshot();
    setSnap(next);
    if (persist && profileId.current) writeCoastSave(profileId.current, session.toSave());
    if (!next.notice) return;
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => {
      if (!sessionRef.current) return;
      sessionRef.current.notice = null;
      haltRef.current = sessionRef.current.suspended || mapOpenRef.current;
      setSnap(sessionRef.current.snapshot());
    }, 4200);
  }, []);

  useEffect(() => {
    const id = readStoredProfile()?.id ?? LOCAL_PLAYER;
    profileId.current = id;
    const session = new CoastSession(readCoastSave(id));
    sessionRef.current = session;
    haltRef.current = session.suspended || mapOpenRef.current;
    setSnap(session.snapshot());
    setAllowed(true);
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (snap?.panel) document.exitPointerLock();
  }, [snap?.panel]);

  const setMap = useCallback((open: boolean) => {
    mapOpenRef.current = open;
    haltRef.current = open || (sessionRef.current?.suspended ?? false);
    setMapOpen(open);
    if (open) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.code === "KeyM") {
        event.preventDefault();
        setMap(!mapOpenRef.current);
        return;
      }
      if (event.code !== "Escape") return;
      if (mapOpenRef.current) {
        setMap(false);
        return;
      }
      if (!sessionRef.current?.panel) return;
      sessionRef.current.dismiss();
      publish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [publish, setMap]);

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
        pose={pose}
        collectedIds={snap.collectedIds}
        waypoint={snap.waypoint}
        onReady={markReady}
        onSession={onSession}
      />
      {!ready ? <div className="nl-boot">Opening the waterfront…</div> : null}
      {ready && !locked && !snap.panel && !mapOpen ? (
        <button type="button" className="nl-look-gate" onClick={request}>
          <strong>Click to look</strong>
          <span>Esc releases the mouse</span>
        </button>
      ) : null}
      <CoastHud snap={snap} />
      <MiniMap pose={pose} waypoint={snap.waypoint} pin={pin} />
      <ControlGuide />
      {mapOpen ? <WorldMap pose={pose} waypoint={snap.waypoint} pin={pin} onClose={() => setMap(false)} /> : null}
      {snap.panel ? (
        <MissionPanel panel={snap.panel} body={snap.panelBody} onAccept={accept} onDismiss={dismiss} />
      ) : null}
    </main>
  );
}
