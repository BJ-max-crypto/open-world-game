"use client";

import { Minimap } from "@/components/HUD/Minimap";
import type { GameSnapshot } from "@/game/engine/types";

export function HUD({ snapshot }: { snapshot: GameSnapshot }) {
  const cash = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(snapshot.cash);

  return (
    <div className="nl-hud">
      <header className="nl-hud-top">
        <div>
          <p className="nl-kicker">{snapshot.district}</p>
          <h1>{snapshot.missionTitle}</h1>
          {snapshot.objective ? <p className="nl-objective">{snapshot.objective}</p> : <p className="nl-objective">The night is yours.</p>}
        </div>
        <div className="nl-cash">
          <span>Cash</span>
          <strong>{cash}</strong>
          <span className="nl-callsign">{snapshot.callsign}</span>
        </div>
      </header>

      {snapshot.notice ? <p className="nl-notice">{snapshot.notice}</p> : null}

      <footer className="nl-hud-bottom">
        <Minimap snapshot={snapshot} />
        <div className="nl-prompts">
          {snapshot.prompts.map((prompt) => (
            <p key={`${prompt.key}-${prompt.label}`}>
              <kbd>{prompt.key}</kbd>
              {prompt.label}
            </p>
          ))}
          {!snapshot.settled ? <p className="nl-hint">Click the street to look. WASD walks. F is the cab. E is a door.</p> : null}
        </div>
        <div className="nl-meters">
          {snapshot.driving ? (
            <>
              <span>Speed</span>
              <strong>{Math.round(snapshot.speedKmh)}</strong>
              <span>km/h</span>
            </>
          ) : (
            <>
              <span>Stamina</span>
              <div className="nl-bar" aria-hidden>
                <i style={{ width: `${Math.round(snapshot.stamina * 100)}%` }} />
              </div>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
