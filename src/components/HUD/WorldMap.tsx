"use client";

import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import type { PlayerPose } from "@/game/player/pose";
import { drawDistrict } from "@/game/world/map/drawMap";
import { mapToWorld } from "@/game/world/map/project";

interface WorldMapProps {
  pose: RefObject<PlayerPose>;
  waypoint: { x: number; z: number } | null;
  pin: RefObject<{ x: number; z: number } | null>;
  onClose: () => void;
}

/**
 * The world keeps simulating while this is open. Walking input is ignored so
 * map controls do not move the character. The marker still follows the body.
 */
export function WorldMap({ pose, waypoint, pin, onClose }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ centerX: pose.current?.x ?? 0, centerZ: pose.current?.z ?? 0, span: 108 });
  const drag = useRef<{ x: number; y: number; cx: number; cz: number } | null>(null);
  const waypointRef = useRef(waypoint);
  waypointRef.current = waypoint;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * 2));
      canvas.height = Math.max(1, Math.floor(rect.height * 2));
    };
    resize();
    window.addEventListener("resize", resize);
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const player = pose.current;
      if (!player) return;
      drawDistrict(
        ctx,
        {
          width: canvas.width,
          height: canvas.height,
          centerX: view.current.centerX,
          centerZ: view.current.centerZ,
          span: view.current.span,
        },
        player,
        waypointRef.current,
        pin.current,
      );
    };
    frame = requestAnimationFrame(draw);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const next = view.current.span * (event.deltaY > 0 ? 1.12 : 0.88);
      view.current.span = Math.min(160, Math.max(28, next));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [pose]);

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      cx: view.current.centerX,
      cz: view.current.centerZ,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    const canvas = canvasRef.current;
    if (!start || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const metersPerPixel = view.current.span / rect.width;
    view.current.centerX = start.cx - (event.clientX - start.x) * metersPerPixel;
    view.current.centerZ = start.cz + (event.clientY - start.y) * metersPerPixel;
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    drag.current = null;
    const canvas = canvasRef.current;
    if (!start || !canvas) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pin.current = mapToWorld(event.clientX - rect.left, event.clientY - rect.top, {
      width: rect.width,
      height: rect.height,
      centerX: view.current.centerX,
      centerZ: view.current.centerZ,
      span: view.current.span,
    });
  }

  function onDoubleClick() {
    const player = pose.current;
    if (!player) return;
    view.current.centerX = player.x;
    view.current.centerZ = player.z;
  }

  return (
    <section className="nl-worldmap" role="dialog" aria-label="City map">
      <header>
        <div>
          <p className="nl-kicker">The Coast</p>
          <h2>Waterfront</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close map">
          X
        </button>
      </header>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      />
      <p>Drag to pan. Scroll to zoom. Click to drop a pin. Double-click to recenter. The city keeps moving. M or Esc closes this.</p>
      <ul>
        <li>You</li>
        <li>Mission</li>
        <li>Pin</li>
        <li>Inez</li>
        <li>Park, roads, and open marina door</li>
      </ul>
    </section>
  );
}
