import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  description: string;
  uptime_pct: number;
  checked_at: string;
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
    const services: ServiceStatus[] = [];

    // 1. Platform (Web App & API) — if this function responds, it's up
    services.push({
      name: "Platform (Web App & API)",
      status: "operational",
      description: "Supabase backend, authentication, and web interface.",
      uptime_pct: 100,
      checked_at: now.toISOString(),
    });

    // 2. Database — try a lightweight query
    let dbStatus: ServiceStatus["status"] = "operational";
    try {
      const { error } = await supabase
        .from("tenants")
        .select("id", { count: "exact", head: true });
      if (error) dbStatus = "degraded";
    } catch {
      dbStatus = "down";
    }
    services.push({
      name: "Database",
      status: dbStatus,
      description: "PostgreSQL primary datastore.",
      uptime_pct: dbStatus === "operational" ? 100 : dbStatus === "degraded" ? 95 : 0,
      checked_at: now.toISOString(),
    });

    // 3. Relay Network — aggregate across ALL tenants (no tenant-specific data exposed)
    let relayStatus: ServiceStatus["status"] = "operational";
    let relayUptime = 100;
    try {
      const { data: relays, error } = await supabase
        .from("relay_nodes")
        .select("status, last_seen");

      if (error) {
        relayStatus = "degraded";
        relayUptime = 50;
      } else if (!relays || relays.length === 0) {
        relayStatus = "operational";
        relayUptime = 100;
      } else {
        const total = relays.length;
        const online = relays.filter(
          (r: any) => r.status === "Online",
        ).length;
        const pct = Math.round((online / total) * 100);
        relayUptime = pct;

        if (pct === 0) relayStatus = "down";
        else if (pct < 80) relayStatus = "degraded";
        else relayStatus = "operational";
      }
    } catch {
      relayStatus = "down";
      relayUptime = 0;
    }
    services.push({
      name: "Relay Network",
      status: relayStatus,
      description: "WebSocket relay infrastructure bridging agents to the platform.",
      uptime_pct: relayUptime,
      checked_at: now.toISOString(),
    });

    // 4. Command Center (Task Pipeline) — check if tasks are flowing
    let taskStatus: ServiceStatus["status"] = "operational";
    try {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentTasks, error } = await supabase
        .from("remote_tasks")
        .select("status")
        .gte("created_at", oneDayAgo)
        .limit(50);

      if (error) {
        taskStatus = "degraded";
      } else if (recentTasks && recentTasks.length > 0) {
        const stuck = recentTasks.filter(
          (t: any) => t.status === "Pending" || t.status === "Sent",
        ).length;
        const stuckPct = stuck / recentTasks.length;
        if (stuckPct > 0.8) taskStatus = "degraded";
      }
    } catch {
      taskStatus = "degraded";
    }
    services.push({
      name: "Command Center",
      status: taskStatus,
      description: "Task dispatch pipeline (create → poll → execute → result).",
      uptime_pct: taskStatus === "operational" ? 100 : 80,
      checked_at: now.toISOString(),
    });

    // 5. Real-time Events
    services.push({
      name: "Real-time Events",
      status: "operational",
      description: "Supabase Realtime for live updates and notifications.",
      uptime_pct: 100,
      checked_at: now.toISOString(),
    });

    // 6. Build Pipeline
    let buildStatus: ServiceStatus["status"] = "operational";
    try {
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: builds, error } = await supabase
        .from("build_history")
        .select("status")
        .gte("created_at", twoDaysAgo)
        .limit(20);

      if (error) {
        buildStatus = "degraded";
      } else if (builds && builds.length > 0) {
        const failRate =
          builds.filter((b: any) => b.status === "failed").length / builds.length;
        if (failRate > 0.5) buildStatus = "degraded";
      }
    } catch {
      buildStatus = "degraded";
    }
    services.push({
      name: "Build Pipeline",
      status: buildStatus,
      description: "Agent binary compilation via GitHub Actions.",
      uptime_pct: buildStatus === "operational" ? 100 : 75,
      checked_at: now.toISOString(),
    });

    // Overall status
    const hasDown = services.some((s) => s.status === "down");
    const hasDegraded = services.some((s) => s.status === "degraded");
    const overall: ServiceStatus["status"] = hasDown
      ? "down"
      : hasDegraded
        ? "degraded"
        : "operational";

    return new Response(
      JSON.stringify({
        overall,
        services,
        checked_at: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    console.error("public-status error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to check status" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
