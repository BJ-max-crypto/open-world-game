import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

export function createClient(): SupabaseClient<Database> | null {
  const env = supabaseEnv();
  if (!env || typeof window === "undefined") return null;
  return createBrowserClient<Database>(env.url, env.key);
}
