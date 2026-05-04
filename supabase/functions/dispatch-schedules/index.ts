// Dispatches due scheduled_tasks into remote_tasks. Invoked every minute by pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Minimal cron evaluator: supports "*", "*/n", "a,b,c", "a-b", numeric values
// Fields: minute hour day-of-month month day-of-week (0=Sun)
function fieldMatches(expr: string, value: number, min: number, max: number): boolean {
  for (const part of expr.split(",")) {
    const [range, stepStr] = part.split("/");
    const step = stepStr ? parseInt(stepStr, 10) : 1;
    let lo = min, hi = max;
    if (range !== "*") {
      if (range.includes("-")) {
        const [a, b] = range.split("-").map((n) => parseInt(n, 10));
        lo = a; hi = b;
      } else {
        const n = parseInt(range, 10);
        lo = n; hi = n;
      }
    }
    for (let v = lo; v <= hi; v += step) {
      if (v === value) return true;
    }
  }
  return false;
}

function cronMatches(expr: string, d: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [m, h, dom, mon, dow] = parts;
  return (
    fieldMatches(m, d.getUTCMinutes(), 0, 59) &&
    fieldMatches(h, d.getUTCHours(), 0, 23) &&
    fieldMatches(dom, d.getUTCDate(), 1, 31) &&
    fieldMatches(mon, d.getUTCMonth() + 1, 1, 12) &&
    fieldMatches(dow, d.getUTCDay(), 0, 6)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  // Truncate to minute for idempotency window
  const minuteStart = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), 0, 0,
  ));

  const { data: schedules, error } = await supabase
    .from("scheduled_tasks")
    .select("id, tenant_id, command, target_ids, cron_expression, enabled, last_run_at")
    .eq("enabled", true);

  if (error) {
    console.error("[dispatch-schedules] fetch failed", error.message);
    return json({ error: "Internal server error" }, 500);
  }

  let dispatched = 0;
  let skipped = 0;

  for (const s of schedules ?? []) {
    if (!cronMatches(s.cron_expression, minuteStart)) { skipped++; continue; }

    // Idempotency: if last_run_at is already within this minute, skip
    if (s.last_run_at) {
      const last = new Date(s.last_run_at);
      if (last >= minuteStart) { skipped++; continue; }
    }

    const targets: string[] = Array.isArray(s.target_ids) ? s.target_ids : [];
    if (targets.length === 0) { skipped++; continue; }

    const rows = targets.map((target_id) => ({
      tenant_id: s.tenant_id,
      target_id,
      command: s.command,
    }));

    const { error: insErr } = await supabase.from("remote_tasks").insert(rows);
    if (insErr) {
      console.error(`[dispatch-schedules] insert failed for schedule=${s.id}`, insErr.message);
      continue;
    }

    await supabase
      .from("scheduled_tasks")
      .update({ last_run_at: minuteStart.toISOString() })
      .eq("id", s.id);

    dispatched += rows.length;
    console.log(`[dispatch-schedules] schedule=${s.id} dispatched ${rows.length} task(s)`);
  }

  return json({ ok: true, dispatched, skipped, at: minuteStart.toISOString() });
});
