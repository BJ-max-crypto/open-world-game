"use client";

import type { CoastPanel } from "@/game/session/CoastSession";

interface MissionPanelProps {
  panel: CoastPanel;
  body: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function MissionPanel({ panel, body, onAccept, onDismiss }: MissionPanelProps) {
  const title = panel === "offer" ? "A First Opportunity" : panel === "complete" ? "Delivery complete" : "Inez Calder";
  return (
    <div className="nl-overlay">
      <section className="nl-card nl-mission" role="dialog" aria-labelledby="mission-title">
        <p className="nl-kicker">{panel === "complete" ? "Paid" : "Marina"}</p>
        <h2 id="mission-title">{title}</h2>
        <p>{body}</p>
        <div className="nl-hero-actions">
          {panel === "offer" ? (
            <button type="button" onClick={onAccept} autoFocus>
              Accept the job
            </button>
          ) : null}
          <button type="button" className="nl-button-ghost" onClick={onDismiss} autoFocus={panel !== "offer"}>
            {panel === "complete" ? "Close" : "Not now"}
          </button>
        </div>
      </section>
    </div>
  );
}
