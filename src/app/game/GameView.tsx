"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HUD } from "@/components/HUD/HUD";
import { ManagementPanel } from "@/components/Management/ManagementPanel";
import { WorldMap } from "@/components/Map/WorldMap";
import { PauseMenu } from "@/components/Menus/PauseMenu";
import type { Game } from "@/game/engine/Game";
import { loadSettings } from "@/game/engine/GameConfig";
import type { GameSnapshot } from "@/game/engine/types";
import { recordEntry } from "@/services/EconomyService";
import { restoreProfile, type Profile } from "@/services/PlayerService";
import { loadSave, writeSave } from "@/services/SaveService";

export function GameView() {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    const mount = mountRef.current;
    if (!mount) return;

    const boot = async () => {
      try {
        const profile = await restoreProfile();
        if (dead) return;
        if (!profile) {
          router.replace("/login");
          return;
        }
        profileRef.current = profile;
        const save = await loadSave(profile);
        if (dead || !mountRef.current) return;
        const { Game } = await import("@/game/engine/Game");
        const game = new Game({
          container: mountRef.current,
          settings: loadSettings(),
          save,
          callsign: profile.callsign,
          onSnapshot: (next) => {
            if (!dead) setSnapshot(next);
          },
          onLedger: (entry) => {
            void recordEntry(profile, entry);
          },
          onPersist: (data) => {
            void writeSave(profile, data);
          },
        });
        if (dead) {
          game.dispose();
          return;
        }
        gameRef.current = game;
        game.start();
      } catch (caught) {
        if (!dead) setError(caught instanceof Error ? caught.message : "The city failed to start.");
      }
    };

    void boot();
    return () => {
      dead = true;
      const game = gameRef.current;
      const profile = profileRef.current;
      if (game && profile) void writeSave(profile, game.exportSave());
      game?.dispose();
      gameRef.current = null;
    };
  }, [router]);

  return (
    <main className="nl-stage">
      <div ref={mountRef} className="nl-mount" />
      {!snapshot && !error ? <div className="nl-boot">Opening the district…</div> : null}
      {error ? <div className="nl-boot">{error}</div> : null}
      {snapshot ? (
        <>
          <HUD snapshot={snapshot} />
          {snapshot.panel === "pause" ? (
            <PauseMenu
              onResume={() => gameRef.current?.setPanel("none")}
              onMap={() => gameRef.current?.setPanel("map")}
              onManagement={() => gameRef.current?.setPanel("management")}
              onSave={() => gameRef.current?.saveNow()}
            />
          ) : null}
          {snapshot.panel === "map" ? (
            <WorldMap
              snapshot={snapshot}
              onClose={() => gameRef.current?.setPanel("none")}
              onWaypoint={(x, z) => gameRef.current?.setWaypoint(x, z)}
              onClear={() => gameRef.current?.clearWaypoint()}
            />
          ) : null}
          {snapshot.panel === "management" ? (
            <ManagementPanel
              snapshot={snapshot}
              onClose={() => gameRef.current?.setPanel("none")}
              onBuy={(id) => gameRef.current?.purchase(id)}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}
