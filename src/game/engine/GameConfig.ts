export const WORLD_HALF = 120;
export const ROAD_HALF = 8;
export const START_CASH = 250;

export const GAME_CONFIG = {
  world: { half: WORLD_HALF, roadHalf: ROAD_HALF },
  player: {
    walk: 5.2,
    sprint: 9,
    jump: 7.4,
    radius: 0.42,
  },
  camera: {
    distance: 6.6,
    lookHeight: 1.45,
    minPitch: -0.32,
    maxPitch: 1.02,
  },
  vehicle: {
    accel: 16,
    brake: 30,
    reverseAccel: 10,
    maxSpeed: 22,
    maxReverse: 6.5,
    steer: 1.45,
    radius: 2.05,
  },
  physics: { gravity: 24 },
  economy: { startCash: START_CASH },
} as const;

export interface Settings {
  mouseSensitivity: number;
  invertY: boolean;
  volume: number;
  shadows: boolean;
  quality: "low" | "medium" | "high";
}

export const DEFAULT_SETTINGS: Settings = {
  mouseSensitivity: 0.0022,
  invertY: false,
  volume: 0.65,
  shadows: true,
  quality: "high",
};

const SETTINGS_KEY = "northline-settings-v1";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const quality = parsed.quality;
    return {
      mouseSensitivity: clampSetting(parsed.mouseSensitivity, 0.0006, 0.006, DEFAULT_SETTINGS.mouseSensitivity),
      invertY: Boolean(parsed.invertY),
      volume: clampSetting(parsed.volume, 0, 1, DEFAULT_SETTINGS.volume),
      shadows: parsed.shadows !== false,
      quality: quality === "low" || quality === "medium" || quality === "high" ? quality : "high",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function clampSetting(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
