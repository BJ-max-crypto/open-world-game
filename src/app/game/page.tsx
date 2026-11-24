"use client";

import dynamic from "next/dynamic";

const GameView = dynamic(() => import("./GameView").then((mod) => mod.GameView), {
  ssr: false,
  loading: () => <main className="nl-stage"><div className="nl-boot">Opening the waterfront…</div></main>,
});

export default function GamePage() {
  return <GameView />;
}
