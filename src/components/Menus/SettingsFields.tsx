"use client";

import type { Settings } from "@/game/engine/GameConfig";

export function SettingsFields({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  return (
    <div className="nl-fields">
      <label>
        Mouse sensitivity
        <input
          type="range"
          min={0.0008}
          max={0.005}
          step={0.0001}
          value={settings.mouseSensitivity}
          onChange={(event) => onChange({ ...settings, mouseSensitivity: Number(event.target.value) })}
        />
      </label>
      <label className="nl-check">
        <input
          type="checkbox"
          checked={settings.invertY}
          onChange={(event) => onChange({ ...settings, invertY: event.target.checked })}
        />
        Invert vertical look
      </label>
      <label>
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.volume}
          onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })}
        />
      </label>
      <label className="nl-check">
        <input
          type="checkbox"
          checked={settings.shadows}
          onChange={(event) => onChange({ ...settings, shadows: event.target.checked })}
        />
        Shadows
      </label>
      <label>
        Picture
        <select
          value={settings.quality}
          onChange={(event) =>
            onChange({ ...settings, quality: event.target.value as Settings["quality"] })
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
    </div>
  );
}
