"use client";

import type { CoastSnapshot } from "@/game/session/CoastSession";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function CoastHud({ snap }: { snap: CoastSnapshot }) {
  return (
    <div className="nl-hud">
      <header className="nl-hud-top">
        <div>
          <p className="nl-kicker">The Coast</p>
          <h1>{snap.title}</h1>
          <p className="nl-objective">{snap.objective}</p>
          {snap.status === "active" ? (
            <p className="nl-objective">
              Packages {snap.collected}/{snap.total}
            </p>
          ) : null}
        </div>
        <div className="nl-cash">
          <span>Cash</span>
          <strong>{money.format(snap.cash)}</strong>
        </div>
      </header>
      {snap.notice ? (
        <p className="nl-notice" role="status">
          {snap.notice}
        </p>
      ) : null}
      {snap.prompt ? (
        <p className="nl-coast-prompt">
          <kbd>E</kbd>
          {snap.prompt.label}
        </p>
      ) : null}
    </div>
  );
}
