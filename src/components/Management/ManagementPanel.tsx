"use client";

import type { GameSnapshot } from "@/game/engine/types";

export function ManagementPanel({
  snapshot,
  onClose,
  onBuy,
}: {
  snapshot: GameSnapshot;
  onClose: () => void;
  onBuy: (id: string) => void;
}) {
  return (
    <section className="nl-overlay" role="dialog" aria-label="Management">
      <div className="nl-sheet">
        <header>
          <div>
            <p className="nl-kicker">Pockets</p>
            <h2>What you carry</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="nl-split">
          <div>
            <h3>Inventory</h3>
            <ul className="nl-list">
              {snapshot.inventory.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Properties</h3>
            <ul className="nl-list">
              {snapshot.properties.map((property) => {
                const price = property.price.toLocaleString("en-US");
                const near = snapshot.nearPropertyId === property.id;
                return (
                  <li key={property.id}>
                    <strong>
                      {property.name}
                      <em>{property.owned ? "Yours" : `$${price}`}</em>
                    </strong>
                    <span>{property.blurb}</span>
                    {!property.owned ? (
                      <button type="button" disabled={!near || snapshot.cash < property.price} onClick={() => onBuy(property.id)}>
                        {near ? "Buy at the door" : "Walk to the door"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
