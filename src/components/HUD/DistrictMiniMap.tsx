"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { PlayerPose } from "@/game/player/pose";
import { drawDistrict } from "@/game/world/map/drawMap";

interface MiniMapProps {
  pose: RefObject<PlayerPose>;
  waypoint: { x: number; z: number } | null;
}

/** North-up map around the player. Drawn from the pose ref, not from React state. */
export function MiniMap({ pose, waypoint }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waypointRef = useRef(waypoint);
  waypointRef.current = waypoint;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const player = pose.current;
      if (!player) return;
      drawDistrict(
        ctx,
        { width: canvas.width, height: canvas.height, centerX: player.x, centerZ: player.z, span: 46 },
        player,
        waypointRef.current,
      );
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [pose]);

  return (
    <div className="nl-minimap">
      <canvas ref={canvasRef} width={320} height={320} aria-label="Mini-map" />
      <span>N</span>
    </div>
  );
}
