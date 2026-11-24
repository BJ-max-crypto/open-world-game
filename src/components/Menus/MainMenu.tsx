"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readStoredProfile } from "@/services/PlayerService";

export function MainMenu() {
  const [callsign, setCallsign] = useState<string | null>(null);

  useEffect(() => {
    setCallsign(readStoredProfile()?.callsign ?? null);
  }, []);

  return (
    <div className="nl-hero-copy">
      <p className="nl-kicker">Open district</p>
      <h1>
        Night rate
        <br />
        still open.
      </h1>
      <p className="nl-lede">
        Walk the blocks, take the harbor cab, and buy a room before the night gets expensive.
      </p>
      <div className="nl-hero-actions">
        <Link className="nl-button" href={callsign ? "/game" : "/login"}>
          {callsign ? `Enter as ${callsign}` : "Enter the city"}
        </Link>
        <Link className="nl-button nl-button-ghost" href="/login">
          Sign in
        </Link>
        <Link className="nl-button nl-button-ghost" href="/settings">
          Settings
        </Link>
      </div>
    </div>
  );
}
