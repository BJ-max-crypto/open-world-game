"use client";

import { useEffect, useRef } from "react";
import { drawCity, worldFromMapClick } from "@/components/Map/drawCity";
import type { GameSnapshot } from "@/game/engine/types";

export function WorldMap({
  snapshot,
  onClose,
  onWaypoint,
  onClear,
}: {
  snapshot: GameSnapshot;
  onClose: () => void;
  onWaypoint: (x: number, z: number) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCity(
      ctx,
      canvas.width,
      canvas.height,
      {
        x: snapshot.x,
        z: snapshot.z,
        yaw: snapshot.yaw,
        objective: snapshot.objectivePoint,
        waypoint: snapshot.waypoint,
      },
      "world",
    );
  }, [snapshot]);

  return (
    <section className="nl-overlay" role="dialog" aria-label="City map">
      <div className="nl-map-card">
        <header>
          <div>
            <p className="nl-kicker">Northline</p>
            <h2>City map</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <canvas
          ref={ref}
          width={900}
          height={900}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const point = worldFromMapClick(
              ((event.clientX - rect.left) / rect.width) * 900,
              ((event.clientY - rect.top) / rect.height) * 900,
              900,
              900,
            );
            onWaypoint(point.x, point.z);
          }}
        />
        <p>Click a block to drop a pin. Amber is the fare. Teal is your pin.</p>
        <button type="button" className="nl-text" onClick={onClear} disabled={!snapshot.waypoint}>
          Clear pin
        </button>
      </div>
    </section>
  );
}
