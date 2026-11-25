import { SOLIDS, ROADS } from "@/game/world/coast/layout";
import { PARK, WALKS } from "@/game/world/life/routes";
import { worldToMap, type MapView } from "@/game/world/map/project";

export interface MapMarker {
  x: number;
  z: number;
}

const BUILDINGS = SOLIDS.filter((solid) => solid.kind === "building");

const FILL: Record<string, string> = {
  "marina-office": "#d7c4a4",
  "salt-cafe": "#c4a090",
  "harbor-house": "#b7c3c8",
  market: "#d9d0c2",
  "yard-shop": "#9a8f84",
  "warehouse-3": "#8a9094",
  "pier-tower": "#c5d0d4",
  "fuel-stop": "#c6b7a2",
};

export function drawDistrict(
  ctx: CanvasRenderingContext2D,
  view: MapView,
  player: { x: number; z: number; yaw: number },
  waypoint: MapMarker | null,
  pin: MapMarker | null = null,
  kayak: MapMarker | null = null,
): void {
  const { width, height } = view;
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#243038");
  sky.addColorStop(1, "#1a242c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const waterTop = worldToMap(0, -24, view);
  const water = ctx.createLinearGradient(0, waterTop.py - 40, 0, height);
  water.addColorStop(0, "#67b7b4");
  water.addColorStop(1, "#1d5964");
  ctx.fillStyle = water;
  ctx.fillRect(0, waterTop.py, width, height - waterTop.py);

  const park = worldToMap(PARK.x - PARK.w / 2, PARK.z + PARK.d / 2, view);
  const parkEnd = worldToMap(PARK.x + PARK.w / 2, PARK.z - PARK.d / 2, view);
  ctx.fillStyle = "#5f7358";
  ctx.fillRect(park.px, park.py, parkEnd.px - park.px, parkEnd.py - park.py);

  ctx.strokeStyle = "#8d8478";
  ctx.lineWidth = 3;
  for (const loop of WALKS) {
    ctx.beginPath();
    loop.points.forEach((point, index) => {
      const at = worldToMap(point.x, point.z, view);
      if (index === 0) ctx.moveTo(at.px, at.py);
      else ctx.lineTo(at.px, at.py);
    });
    ctx.stroke();
  }

  ctx.fillStyle = "#3a4148";
  for (const road of ROADS) {
    const topLeft = worldToMap(road.x - road.w / 2, road.z + road.d / 2, view);
    const bottomRight = worldToMap(road.x + road.w / 2, road.z - road.d / 2, view);
    ctx.fillRect(topLeft.px, topLeft.py, bottomRight.px - topLeft.px, bottomRight.py - topLeft.py);
  }

  ctx.strokeStyle = "#e6d7a2";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  for (const road of ROADS) {
    const horizontal = road.w > road.d;
    const start = worldToMap(horizontal ? road.x - road.w / 2 : road.x, horizontal ? road.z : road.z - road.d / 2, view);
    const end = worldToMap(horizontal ? road.x + road.w / 2 : road.x, horizontal ? road.z : road.z + road.d / 2, view);
    ctx.beginPath();
    ctx.moveTo(start.px, start.py);
    ctx.lineTo(end.px, end.py);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const building of BUILDINGS) {
    const topLeft = worldToMap(building.x - building.w / 2, building.z + building.d / 2, view);
    const bottomRight = worldToMap(building.x + building.w / 2, building.z - building.d / 2, view);
    ctx.fillStyle = FILL[building.id] ?? "#8d867c";
    ctx.fillRect(topLeft.px, topLeft.py, bottomRight.px - topLeft.px, bottomRight.py - topLeft.py);
    ctx.strokeStyle = building.id === "marina-office" ? "#e7a25a" : "#2c3136";
    ctx.lineWidth = building.id === "marina-office" ? 2 : 1;
    ctx.strokeRect(topLeft.px, topLeft.py, bottomRight.px - topLeft.px, bottomRight.py - topLeft.py);
  }

  const contact = SOLIDS.find((solid) => solid.id === "inez");
  if (contact) drawDiamond(ctx, worldToMap(contact.x, contact.z, view), "#9fd7c9");
  if (waypoint) drawDiamond(ctx, worldToMap(waypoint.x, waypoint.z, view), "#e7a25a");
  if (pin) drawDiamond(ctx, worldToMap(pin.x, pin.z, view), "#8eb6e0", 11);
  if (kayak) {
    const mark = worldToMap(kayak.x, kayak.z, view);
    ctx.save();
    ctx.translate(mark.px, mark.py);
    ctx.fillStyle = "#e7f2f4";
    ctx.strokeStyle = "#1c3c44";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  drawPlayer(ctx, worldToMap(player.x, player.z, view), player.yaw);
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  point: { px: number; py: number },
  color: string,
  size = 6,
): void {
  ctx.save();
  ctx.translate(point.px, point.py);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#f4efe4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.8, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
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
