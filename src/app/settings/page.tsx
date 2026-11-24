"use client";

import Link from "next/link";
import { useState } from "react";
import { SettingsFields } from "@/components/Menus/SettingsFields";
import { loadSettings, saveSettings, type Settings } from "@/game/engine/GameConfig";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [saved, setSaved] = useState(false);

  function update(next: Settings) {
    setSettings(next);
    saveSettings(next);
    setSaved(true);
  }

  return (
    <main className="nl-page">
      <Link href="/" className="nl-back">
        Northline
      </Link>
      <section className="nl-card">
        <p className="nl-kicker">Rig</p>
        <h1>Settings</h1>
        <p className="nl-fine">Stored on this device.</p>
        <SettingsFields settings={settings} onChange={update} />
        {saved ? <p className="nl-message">Saved on this device.</p> : null}
        <Link className="nl-button" href="/game">
          Back to the city
        </Link>
      </section>
    </main>
  );
}
