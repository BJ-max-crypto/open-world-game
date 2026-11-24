export interface AABB {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Circle {
  x: number;
  z: number;
  radius: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function circleHitsBox(body: Circle, box: AABB): boolean {
  const nearestX = clamp(body.x, box.minX, box.maxX);
  const nearestZ = clamp(body.z, box.minZ, box.maxZ);
  const dx = body.x - nearestX;
  const dz = body.z - nearestZ;
  return dx * dx + dz * dz < body.radius * body.radius;
}

export function resolveCircle(body: Circle, boxes: AABB[]): { x: number; z: number } {
  let { x, z } = body;
  const radius = body.radius;

  for (let pass = 0; pass < 3; pass += 1) {
    for (const box of boxes) {
      const nearestX = clamp(x, box.minX, box.maxX);
      const nearestZ = clamp(z, box.minZ, box.maxZ);
      let dx = x - nearestX;
      let dz = z - nearestZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= radius * radius) continue;

      if (distanceSq === 0) {
        const left = x - box.minX;
        const right = box.maxX - x;
        const south = z - box.minZ;
        const north = box.maxZ - z;
        const min = Math.min(left, right, south, north);
        if (min === left) x = box.minX - radius;
        else if (min === right) x = box.maxX + radius;
        else if (min === south) z = box.minZ - radius;
        else z = box.maxZ + radius;
        continue;
      }

      const distance = Math.sqrt(distanceSq);
      const push = (radius - distance) / distance;
      x += dx * push;
      z += dz * push;
    }
  }

  return { x, z };
}

export function pointBlocked(x: number, z: number, radius: number, boxes: AABB[]): boolean {
  return boxes.some((box) => circleHitsBox({ x, z, radius }, box));
}
