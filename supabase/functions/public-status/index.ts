import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Health = "operational" | "degraded" | "down";
type DayState = "up" | "degraded" | "down" | "unknown";

interface ServiceStatus {
  name: string;
  status: Health;
  description: string;
  uptime_pct: number;
  bars: DayState[]; // length 90 (oldest -> today)
  checked_at: string;
}

const DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// Map a public service name to incident.affected_services tokens that should match it
const SERVICE_MATCHERS: Record<string, string[]> = {
  "Platform (Web App & API)": ["platform", "web", "api"],
  "Database": ["database", "db", "postgres"],
  "Relay Network": ["relay", "relay_network", "relays"],
  "Command Center": ["command_center", "command", "tasks", "task_pipeline"],
  "Real-time Events": ["realtime", "real-time", "real_time", "events"],
  "Build Pipeline": ["build", "build_pipeline", "builds"],
};

function matchesService(serviceName: string, affected: string[] | null): boolean {
  if (!affected || affected.length === 0) return false;
  const tokens = SERVICE_MATCHERS[serviceName] ?? [];
  const lower = affected.map((a) => (a || "").toLowerCase().trim());
  return lower.some((a) => tokens.some((t) => a === t || a.includes(t)));
}

function impactToDayState(impact: string): "down" | "degraded" {
  return impact === "critical" || impact === "major" ? "down" : "degraded";
}

function buildBars(
  serviceName: string,
  incidents: Array<{
    impact: string;
    affected_services: string[] | null;
    started_at: string;
    resolved_at: string | null;
  }>,
  now: Date,
  currentLive: Health,
): { bars: DayState[]; uptime_pct: number } {
  const bars: DayState[] = new Array(DAYS).fill("up");
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  // i = 0 -> 89 days ago, i = 89 -> today
  for (let i = 0; i < DAYS; i++) {
    const dayStart = new Date(todayStart.getTime() - (DAYS - 1 - i) * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    let worst: DayState = "up";
    for (const inc of incidents) {
      if (!matchesService(serviceName, inc.affected_services)) continue;
      const start = new Date(inc.started_at);
      const end = inc.resolved_at ? new Date(inc.resolved_at) : now;
      if (start < dayEnd && end > dayStart) {
        const s = impactToDayState(inc.impact);
        if (s === "down") {
          worst = "down";
          break;
        }
        if (s === "degraded" && worst === "up") worst = "degraded";
      }
    }
    bars[i] = worst;
  }

  // Reflect the live current state on the most recent bar (today) if worse
  const liveState: DayState =
    currentLive === "down" ? "down" : currentLive === "degraded" ? "degraded" : bars[DAYS - 1];
  const order: Record<DayState, number> = { up: 0, unknown: 0, degraded: 1, down: 2 };
  if (order[liveState] > order[bars[DAYS - 1]]) bars[DAYS - 1] = liveState;

  const upCount = bars.filter((b) => b === "up").length;
  const degradedCount = bars.filter((b) => b === "degraded").length;
  const uptime_pct = Math.round(((upCount + degradedCount * 0.5) / DAYS) * 1000) / 10;

  return { bars, uptime_pct };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - DAYS * DAY_MS).toISOString();

    // Fetch all incidents that overlap the 90-day window
    const { data: rawIncidents } = await supabase
      .from("status_incidents")
      .select("impact, affected_services, started_at, resolved_at")
      .or(`resolved_at.is.null,resolved_at.gte.${ninetyDaysAgo}`);
    const incidents = rawIncidents ?? [];

    // ---------- Live health probes ----------
    // Database
    let dbLive: Health = "operational";
    try {
      const { error } = await supabase
        .from("tenants")
        .select("id", { count: "exact", head: true });
      if (error) dbLive = "degraded";
    } catch {
      dbLive = "down";
    }

    // Relay network (aggregate across all tenants)
    let relayLive: Health = "operational";
    try {
      const { data: relays, error } = await supabase
        .from("relay_nodes")
        .select("status, last_seen");
      if (error) {
        relayLive = "degraded";
      } else if (relays && relays.length > 0) {
        const total = relays.length;
        const online = relays.filter((r: any) => r.status === "Online").length;
        const pct = (online / total) * 100;
        if (pct === 0) relayLive = "down";
        else if (pct < 80) relayLive = "degraded";
      }
    } catch {
      relayLive = "down";
    }

    // Command center: any tasks stuck > 10 min in Pending/Sent right now?
    let commandLive: Health = "operational";
    try {
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("remote_tasks")
        .select("id", { count: "exact", head: true })
        .in("status", ["Pending", "Sent"])
        .lt("created_at", tenMinAgo);
      if (error) commandLive = "degraded";
      else if ((count ?? 0) > 5) commandLive = "degraded";
    } catch {
      commandLive = "degraded";
    }

    // Build pipeline: failure rate over last 48h
    let buildLive: Health = "operational";
    try {
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: builds, error } = await supabase
        .from("build_history")
        .select("status")
        .gte("created_at", twoDaysAgo)
        .limit(50);
      if (error) buildLive = "degraded";
      else if (builds && builds.length >= 3) {
        const failRate =
          builds.filter((b: any) => b.status === "failed" || b.status === "error").length /
          builds.length;
        if (failRate > 0.5) buildLive = "degraded";
      }
    } catch {
      buildLive = "degraded";
    }

    // Realtime: best-effort — assume operational if DB is up
    const realtimeLive: Health = dbLive === "operational" ? "operational" : "degraded";
    // Platform: if this function executed, it's up
    const platformLive: Health = "operational";

    const definitions: Array<{ name: string; description: string; live: Health }> = [
      { name: "Platform (Web App & API)", description: "Web app, edge functions, and authentication.", live: platformLive },
      { name: "Database", description: "PostgreSQL primary datastore.", live: dbLive },
      { name: "Relay Network", description: "WebSocket relay infrastructure bridging agents to the platform.", live: relayLive },
      { name: "Command Center", description: "Task dispatch pipeline (create → poll → execute → result).", live: commandLive },
      { name: "Real-time Events", description: "Supabase Realtime for live updates and notifications.", live: realtimeLive },
      { name: "Build Pipeline", description: "Agent binary compilation via GitHub Actions.", live: buildLive },
    ];

    const services: ServiceStatus[] = definitions.map((d) => {
      const { bars, uptime_pct } = buildBars(d.name, incidents, now, d.live);
      return {
        name: d.name,
        description: d.description,
        status: d.live,
        uptime_pct,
        bars,
        checked_at: now.toISOString(),
      };
    });

    const hasDown = services.some((s) => s.status === "down");
    const hasDegraded = services.some((s) => s.status === "degraded");
    const overall: Health = hasDown ? "down" : hasDegraded ? "degraded" : "operational";

    return new Response(
      JSON.stringify({
        overall,
        services,
        checked_at: now.toISOString(),
        window_days: DAYS,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    console.error("public-status error:", e);
    return new Response(JSON.stringify({ error: "Failed to check status" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
