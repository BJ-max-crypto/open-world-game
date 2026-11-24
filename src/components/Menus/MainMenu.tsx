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
      <p className="nl-kicker">Waterfront</p>
      <h1>
        The first
        <br />
        job is waiting.
      </h1>
      <p className="nl-lede">
        Walk the marina, take a delivery from Inez, and bring three packages back from the warehouse.
      </p>
      <div className="nl-hero-actions">
        <Link className="nl-button" href={callsign ? "/game" : "/login"}>
          {callsign ? `Enter as ${callsign}` : "Enter the coast"}
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
