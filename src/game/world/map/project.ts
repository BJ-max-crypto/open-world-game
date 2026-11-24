export interface MapView {
  width: number;
  height: number;
  centerX: number;
  centerZ: number;
  /** Meters represented by the canvas width. */
  span: number;
}

export function worldToMap(x: number, z: number, view: MapView): { px: number; py: number } {
  const metersPerPixel = view.span / view.width;
  return {
    px: view.width / 2 + (x - view.centerX) / metersPerPixel,
    py: view.height / 2 - (z - view.centerZ) / metersPerPixel,
  };
}

export function mapToWorld(px: number, py: number, view: MapView): { x: number; z: number } {
  const metersPerPixel = view.span / view.width;
  return {
    x: view.centerX + (px - view.width / 2) * metersPerPixel,
    z: view.centerZ - (py - view.height / 2) * metersPerPixel,
  };
}
