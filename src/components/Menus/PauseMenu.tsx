"use client";

import Link from "next/link";

export function PauseMenu({
  onResume,
  onMap,
  onManagement,
  onSave,
}: {
  onResume: () => void;
  onMap: () => void;
  onManagement: () => void;
  onSave: () => void;
}) {
  return (
    <section className="nl-overlay nl-pause" role="dialog" aria-label="Paused">
      <div className="nl-pause-card">
        <p className="nl-kicker">Paused</p>
        <h2>The city keeps the meter running.</h2>
        <div className="nl-pause-actions">
          <button type="button" onClick={onResume}>
            Resume
          </button>
          <button type="button" onClick={onMap}>
            Map
          </button>
          <button type="button" onClick={onManagement}>
            Pockets
          </button>
          <button type="button" onClick={onSave}>
            Save
          </button>
          <Link href="/settings">All settings</Link>
          <Link href="/">Leave the district</Link>
        </div>
        <p className="nl-fine">Esc closes this. M is the map. I is your pockets. Picture and volume live in settings.</p>
      </div>
    </section>
  );
}
