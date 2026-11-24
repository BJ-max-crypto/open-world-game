import { WORLD_HALF } from "@/game/engine/GameConfig";
import { DISTRICTS, buildings, pierDeck, waterZones } from "@/game/world/District";

export interface MapMarkers {
  x: number;
  z: number;
  yaw: number;
  objective: { x: number; z: number } | null;
  waypoint: { x: number; z: number } | null;
}

export function drawCity(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  markers: MapMarkers,
  mode: "mini" | "world",
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#1a211f";
  ctx.fillRect(0, 0, width, height);

  const project = (x: number, z: number) => {
    if (mode === "world") {
      return {
        px: ((x + WORLD_HALF) / (WORLD_HALF * 2)) * width,
        py: ((z + WORLD_HALF) / (WORLD_HALF * 2)) * height,
      };
    }
    const scale = width / 90;
    return {
      px: width / 2 + (x - markers.x) * scale,
      py: height / 2 + (z - markers.z) * scale,
    };
  };

  for (const district of DISTRICTS) {
    const a = project(district.minX, district.minZ);
    const b = project(district.maxX, district.maxZ);
    ctx.fillStyle = district.color;
    ctx.fillRect(a.px, a.py, b.px - a.px, b.py - a.py);
  }

  for (const zone of waterZones()) {
    const a = project(zone.minX, zone.minZ);
    const b = project(zone.maxX, zone.maxZ);
    ctx.fillStyle = "#1b4d5c";
    ctx.fillRect(a.px, a.py, b.px - a.px, b.py - a.py);
  }

  const deck = pierDeck();
  const pier = project(deck.x - deck.w / 2, deck.z - deck.d / 2);
  const pierEnd = project(deck.x + deck.w / 2, deck.z + deck.d / 2);
  ctx.fillStyle = "#6a5a48";
  ctx.fillRect(pier.px, pier.py, pierEnd.px - pier.px, pierEnd.py - pier.py);

  ctx.fillStyle = "#2a3038";
  const road = project(-WORLD_HALF, -8);
  const roadEnd = project(WORLD_HALF, 8);
  ctx.fillRect(road.px, road.py, roadEnd.px - road.px, roadEnd.py - road.py);
  const vertical = project(-8, -WORLD_HALF);
  const verticalEnd = project(8, WORLD_HALF);
  ctx.fillRect(vertical.px, vertical.py, verticalEnd.px - vertical.px, verticalEnd.py - vertical.py);

  ctx.fillStyle = "rgba(239, 231, 218, 0.28)";
  for (const building of buildings()) {
    const a = project(building.x - building.w / 2, building.z - building.d / 2);
    const b = project(building.x + building.w / 2, building.z + building.d / 2);
    ctx.fillRect(a.px, a.py, b.px - a.px, b.py - a.py);
  }

  if (markers.objective) drawDiamond(ctx, project(markers.objective.x, markers.objective.z), "#e7a25a");
  if (markers.waypoint) drawDiamond(ctx, project(markers.waypoint.x, markers.waypoint.z), "#7fbfb6");

  const player = project(markers.x, markers.z);
  ctx.save();
  ctx.translate(player.px, player.py);
  ctx.rotate(-markers.yaw);
  ctx.fillStyle = "#efe7da";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDiamond(ctx: CanvasRenderingContext2D, point: { px: number; py: number }, color: string): void {
  ctx.save();
  ctx.translate(point.px, point.py);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

export function worldFromMapClick(offsetX: number, offsetY: number, width: number, height: number): { x: number; z: number } {
  return {
    x: (offsetX / width) * WORLD_HALF * 2 - WORLD_HALF,
    z: (offsetY / height) * WORLD_HALF * 2 - WORLD_HALF,
  };
}
