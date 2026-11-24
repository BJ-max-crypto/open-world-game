import { SOLIDS, ROADS } from "@/game/world/coast/layout";
import { worldToMap, type MapView } from "@/game/world/map/project";

export interface MapMarker {
  x: number;
  z: number;
}

const BUILDINGS = SOLIDS.filter((solid) => solid.kind === "building");

export function drawDistrict(
  ctx: CanvasRenderingContext2D,
  view: MapView,
  player: { x: number; z: number; yaw: number },
  waypoint: MapMarker | null,
): void {
  const { width, height } = view;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#1a242c";
  ctx.fillRect(0, 0, width, height);

  const water = worldToMap(0, -36, view);
  ctx.fillStyle = "#2f6f78";
  ctx.fillRect(0, water.py, width, height - water.py);

  ctx.fillStyle = "#3a4148";
  for (const road of ROADS) {
    const topLeft = worldToMap(road.x - road.w / 2, road.z + road.d / 2, view);
    const bottomRight = worldToMap(road.x + road.w / 2, road.z - road.d / 2, view);
    ctx.fillRect(topLeft.px, topLeft.py, bottomRight.px - topLeft.px, bottomRight.py - topLeft.py);
  }

  for (const building of BUILDINGS) {
    const topLeft = worldToMap(building.x - building.w / 2, building.z + building.d / 2, view);
    const bottomRight = worldToMap(building.x + building.w / 2, building.z - building.d / 2, view);
    ctx.fillStyle = building.id === "marina-office" ? "#d7c4a4" : "#8d867c";
    ctx.fillRect(topLeft.px, topLeft.py, bottomRight.px - topLeft.px, bottomRight.py - topLeft.py);
    if (building.id === "marina-office") {
      ctx.strokeStyle = "#e7a25a";
      ctx.lineWidth = 2;
      ctx.strokeRect(topLeft.px, topLeft.py, bottomRight.px - topLeft.px, bottomRight.py - topLeft.py);
    }
  }

  const contact = SOLIDS.find((solid) => solid.id === "inez");
  if (contact) drawDiamond(ctx, worldToMap(contact.x, contact.z, view), "#9fd7c9");
  if (waypoint) drawDiamond(ctx, worldToMap(waypoint.x, waypoint.z, view), "#e7a25a");
  drawPlayer(ctx, worldToMap(player.x, player.z, view), player.yaw);
}

function drawDiamond(ctx: CanvasRenderingContext2D, point: { px: number; py: number }, color: string): void {
  ctx.save();
  ctx.translate(point.px, point.py);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  point: { px: number; py: number },
  yaw: number,
): void {
  ctx.save();
  ctx.translate(point.px, point.py);
  // Yaw 0 looks toward -Z, which is down on the north-up map.
  ctx.rotate(yaw);
  ctx.fillStyle = "#f2efe8";
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
