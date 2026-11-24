import type { LedgerEntry } from "@/game/economy/Economy";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/services/PlayerService";

const LEDGER_KEY = "northline-ledger-v1";

export async function recordEntry(profile: Profile, entry: LedgerEntry): Promise<void> {
  appendLocal(entry);
  if (profile.mode !== "cloud") return;
  const supabase = createClient();
  if (!supabase) return;
  const { error } = await supabase.functions.invoke("apply-transaction", {
    body: {
      amount: entry.amount,
      reason: entry.reason,
      balanceAfter: entry.balanceAfter,
      clientId: entry.id,
    },
  });
  if (error) return;
  markSynced(entry.id);
}

function appendLocal(entry: LedgerEntry): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  if (all.some((row) => row.id === entry.id)) return;
  all.push({ ...entry, synced: false });
  window.localStorage.setItem(LEDGER_KEY, JSON.stringify(all.slice(-200)));
}

function markSynced(id: string): void {
  const all = readAll().map((row) => (row.id === id ? { ...row, synced: true } : row));
  window.localStorage.setItem(LEDGER_KEY, JSON.stringify(all));
}

function readAll(): (LedgerEntry & { synced: boolean })[] {
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (LedgerEntry & { synced?: boolean })[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({ ...row, synced: Boolean(row.synced) }));
  } catch {
    return [];
  }
}
