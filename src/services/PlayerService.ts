import { createClient } from "@/lib/supabase/client";
import { cleanCallsign } from "@/services/callsign";

export interface Profile {
  id: string;
  callsign: string;
  createdAt: string;
  mode: "local" | "cloud";
}

const PROFILE_KEY = "northline-profile-v1";

export function readStoredProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    const callsign = typeof parsed.callsign === "string" ? cleanCallsign(parsed.callsign) : null;
    if (!callsign || typeof parsed.id !== "string" || (parsed.mode !== "local" && parsed.mode !== "cloud")) return null;
    return {
      id: parsed.id,
      callsign,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
      mode: parsed.mode,
    };
  } catch {
    return null;
  }
}

export function continueLocally(callsignInput: string): Profile {
  const callsign = cleanCallsign(callsignInput);
  if (!callsign) throw new Error("Use 2–18 letters for a callsign.");
  const profile: Profile = {
    id: `local_${Math.random().toString(36).slice(2, 10)}`,
    callsign,
    createdAt: new Date().toISOString(),
    mode: "local",
  };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function restoreProfile(): Promise<Profile | null> {
  const stored = readStoredProfile();
  const supabase = createClient();
  if (!supabase) return stored;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return stored?.mode === "cloud" ? null : stored;
    const cloud = await ensureProfile(data.claims.sub, stored?.callsign ?? "Runner");
    return cloud ?? stored;
  } catch {
    return stored?.mode === "cloud" ? null : stored;
  }
}

export async function signInCloud(email: string, password: string): Promise<{ profile: Profile | null; message: string }> {
  const supabase = createClient();
  if (!supabase) return { profile: null, message: "Add Supabase keys to turn on cloud saves." };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { profile: null, message: error?.message ?? "Sign-in failed." };
  const profile = await ensureProfile(data.user.id, readStoredProfile()?.callsign ?? "Runner");
  if (!profile) return { profile: null, message: "Signed in, but the profile row is missing." };
  return { profile, message: `Signed in as ${profile.callsign}.` };
}

export async function signUpCloud(
  email: string,
  password: string,
  callsignInput: string,
): Promise<{ profile: Profile | null; message: string }> {
  const callsign = cleanCallsign(callsignInput);
  if (!callsign) return { profile: null, message: "Use 2–18 letters for a callsign." };
  const supabase = createClient();
  if (!supabase) return { profile: null, message: "Add Supabase keys to turn on cloud saves." };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { callsign } },
  });
  if (error) return { profile: null, message: error.message };
  if (!data.session || !data.user) {
    return { profile: null, message: "Check your email to confirm the account, then sign in." };
  }
  const profile = await ensureProfile(data.user.id, callsign);
  return { profile, message: profile ? `Account ready, ${profile.callsign}.` : "Account created, profile not saved." };
}

export async function signOutCloud(): Promise<void> {
  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
  if (typeof window !== "undefined") window.localStorage.removeItem(PROFILE_KEY);
}

async function ensureProfile(userId: string, callsignInput: string): Promise<Profile | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const callsign = cleanCallsign(callsignInput) ?? "Runner";
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, callsign, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (readError) return null;

  let row = existing;
  if (!row) {
    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert({ id: userId, callsign })
      .select("id, callsign, created_at")
      .single();
    if (error || !inserted) return null;
    row = inserted;
  } else if (row.callsign !== callsign && callsign !== "Runner") {
    const { data: updated } = await supabase
      .from("profiles")
      .update({ callsign })
      .eq("id", userId)
      .select("id, callsign, created_at")
      .single();
    if (updated) row = updated;
  }

  const profile: Profile = {
    id: row.id,
    callsign: row.callsign,
    createdAt: row.created_at,
    mode: "cloud",
  };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}
