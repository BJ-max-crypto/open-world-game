export interface Interactable {
  id: string;
  x: number;
  z: number;
  radius: number;
  label: string;
}

/**
 * Closest interactable in range. The current target keeps a little extra
 * distance so the prompt does not flicker on the edge of the radius.
 */
export function nearestInteractable(
  x: number,
  z: number,
  items: readonly Interactable[],
  currentId: string | null,
): Interactable | null {
  let best: Interactable | null = null;
  let bestDistance = Infinity;
  for (const item of items) {
    const distance = Math.hypot(item.x - x, item.z - z);
    const limit = item.radius + (item.id === currentId ? 0.45 : 0);
    if (distance <= limit && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}
