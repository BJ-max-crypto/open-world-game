import type { SaveGame } from "@/game/engine/types";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/services/PlayerService";
import { sanitizeSave } from "@/services/saveSchema";

function keyFor(profileId: string): string {
  return `northline-save-v1:${profileId}`;
}

export async function loadSave(profile: Profile): Promise<SaveGame | null> {
  const local = readLocal(profile.id);
  if (profile.mode !== "cloud") return local;
  const remote = await readRemote();
  return newer(local, remote);
}

export async function writeSave(profile: Profile, save: SaveGame): Promise<void> {
  const clean = sanitizeSave(save);
  if (!clean) return;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyFor(profile.id), JSON.stringify(clean));
  }
  if (profile.mode !== "cloud") return;
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("saves").upsert(
    {
      user_id: profile.id,
      slot: 0,
      payload: clean,
      updated_at: clean.updatedAt,
    },
    { onConflict: "user_id,slot" },
  );
}

function readLocal(profileId: string): SaveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(profileId));
    if (!raw) return null;
    return sanitizeSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readRemote(): Promise<SaveGame | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("saves")
    .select("payload, updated_at")
    .eq("slot", 0)
    .maybeSingle();
  if (error || !data) return null;
  return sanitizeSave(data.payload);
}

function newer(local: SaveGame | null, remote: SaveGame | null): SaveGame | null {
  if (!local) return remote;
  if (!remote) return local;
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
}
