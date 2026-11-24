import { withSupabase } from "npm:@supabase/server@1";

const REASONS = new Set(["mission", "property"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const START_CASH = 250;

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Use POST." }, { status: 405 });
    }

    const body = await req.json().catch(() => null);
    const amount = body?.amount;
    const reason = body?.reason;
    const balanceAfter = body?.balanceAfter;
    const clientId = body?.clientId;
    const claims = ctx.userClaims as { id?: string; sub?: string } | null;
    const userId = claims?.id ?? claims?.sub;

    if (!userId) return Response.json({ error: "Missing user." }, { status: 401 });
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100_000) {
      return Response.json({ error: "Amount is out of range." }, { status: 400 });
    }
    if (typeof reason !== "string" || !REASONS.has(reason)) {
      return Response.json({ error: "Unknown reason." }, { status: 400 });
    }
    if (
      typeof balanceAfter !== "number" ||
      !Number.isInteger(balanceAfter) ||
      balanceAfter < 0 ||
      balanceAfter > 10_000_000
    ) {
      return Response.json({ error: "Balance is out of range." }, { status: 400 });
    }
    if (typeof clientId !== "string" || !UUID.test(clientId)) {
      return Response.json({ error: "clientId must be a uuid." }, { status: 400 });
    }

    const { data: prior, error: priorError } = await ctx.supabase
      .from("economy_ledger")
      .select("balance_after")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (priorError) return Response.json({ error: priorError.message }, { status: 400 });

    const expected = (prior?.balance_after ?? START_CASH) + amount;
    if (expected !== balanceAfter) {
      return Response.json({ error: "Balance does not follow the ledger." }, { status: 409 });
    }

    const { data, error } = await ctx.supabase
      .from("economy_ledger")
      .insert({
        user_id: userId,
        client_id: clientId,
        amount,
        reason,
        balance_after: balanceAfter,
      })
      .select("id, amount, reason, balance_after, created_at")
      .single();

    if (error && error.code !== "23505") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === "23505") {
      const { data: existing } = await ctx.supabase
        .from("economy_ledger")
        .select("id, amount, reason, balance_after, created_at")
        .eq("user_id", userId)
        .eq("client_id", clientId)
        .single();
      return Response.json({ entry: existing, duplicate: true });
    }

    return Response.json({ entry: data, duplicate: false });
  }),
};
