"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { continueLocally, signInCloud, signUpCloud } from "@/services/PlayerService";

export default function LoginPage() {
  const router = useRouter();
  const [callsign, setCallsign] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function enterLocally() {
    try {
      continueLocally(callsign);
      router.push("/game");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not continue.");
    }
  }

  async function cloud(action: "in" | "up") {
    setPending(true);
    setMessage(null);
    const result =
      action === "in" ? await signInCloud(email, password) : await signUpCloud(email, password, callsign);
    setPending(false);
    setMessage(result.message);
    if (result.profile) router.push("/game");
  }

  return (
    <main className="nl-page">
      <Link href="/" className="nl-back">
        Northline
      </Link>
      <section className="nl-card">
        <p className="nl-kicker">Gate</p>
        <h1>Who's walking in?</h1>
        <label>
          Callsign
          <input value={callsign} onChange={(event) => setCallsign(event.target.value)} placeholder="Mara Voss" autoComplete="nickname" />
        </label>
        <button type="button" onClick={enterLocally}>
          Continue on this device
        </button>
        <p className="nl-fine">Local play keeps the save in this browser. Cloud sync starts when a Supabase project is connected.</p>
        <hr />
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        <div className="nl-row">
          <button type="button" disabled={pending} onClick={() => void cloud("in")}>
            Sign in
          </button>
          <button type="button" className="nl-button-ghost" disabled={pending} onClick={() => void cloud("up")}>
            Create account
          </button>
        </div>
        {message ? <p className="nl-message">{message}</p> : null}
      </section>
    </main>
  );
}
