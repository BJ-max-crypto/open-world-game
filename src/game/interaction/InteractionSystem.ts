export interface Prompt {
  key: string;
  label: string;
}

export interface PromptSource {
  x: number;
  z: number;
  radius: number;
  key: string;
  label: string;
}

export function collectPrompts(x: number, z: number, sources: PromptSource[]): Prompt[] {
  return sources
    .map((source) => ({ source, distance: Math.hypot(source.x - x, source.z - z) }))
    .filter((entry) => entry.distance <= entry.source.radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
    .map(({ source }) => ({ key: source.key, label: source.label }));
}
