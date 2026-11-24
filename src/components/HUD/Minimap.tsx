"use client";

import { useEffect, useRef } from "react";
import { drawCity } from "@/components/Map/drawCity";
import type { GameSnapshot } from "@/game/engine/types";

export function Minimap({ snapshot }: { snapshot: GameSnapshot }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    drawCity(
      ctx,
      size,
      size,
      {
        x: snapshot.x,
        z: snapshot.z,
        yaw: snapshot.yaw,
        objective: snapshot.objectivePoint,
        waypoint: snapshot.waypoint,
      },
      "mini",
    );
    ctx.restore();
    ctx.strokeStyle = "rgba(239,231,218,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [snapshot]);

  return <canvas ref={ref} className="nl-minimap" width={320} height={320} aria-label="Minimap" />;
}
