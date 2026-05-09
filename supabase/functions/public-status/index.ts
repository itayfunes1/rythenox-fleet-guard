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

    const heartbeatCutoff = new Date(now.getTime() - 90 * 1000).toISOString();

    // Relay network: operational if AT LEAST one relay is online with a fresh heartbeat.
    // Only "down" when relays exist but none are healthy.
    let relayLive: Health = "operational";
    try {
      const { data: relays, error } = await supabase
        .from("relay_nodes")
        .select("status, last_seen");
      if (error) {
        relayLive = "degraded";
      } else if (relays && relays.length > 0) {
        const healthy = relays.filter((r: any) => {
          if (r.status !== "Online") return false;
          if (!r.last_seen) return false;
          return r.last_seen >= heartbeatCutoff;
        }).length;
        if (healthy === 0) relayLive = "down";
        // else: at least one healthy relay → operational
      }
    } catch {
      relayLive = "down";
    }

    // Command center: the main center proves it's alive by claiming task-poll
    // requests from agents. Each successful poll bumps `last_command_poll_at`
    // on the target device. If devices are heart-beating but no poll has been
    // recorded recently, the command center is offline.
    //   - Devices online but NO recent command poll across the fleet      → down
    //   - Recent polls exist but tasks for online devices stuck >5 min    → degraded
    //   - Same condition stuck >10 min                                    → down
    let commandLive: Health = "operational";
    try {
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
      const pollCutoff = new Date(now.getTime() - 3 * 60 * 1000).toISOString(); // 3 min

      // Keep stored status in sync for views that read managed_devices directly.
      await supabase.rpc("detect_offline_devices");

      // Pull recent stuck tasks (small set) and devices, then join in code.
      const [{ data: stuckTasks, error: e1 }, { data: devices, error: e2 }] = await Promise.all([
        supabase
          .from("remote_tasks")
          .select("target_id, created_at, status")
          .in("status", ["Pending", "Sent"])
          .gte("created_at", thirtyMinAgo)
          .lt("created_at", fiveMinAgo)
          .limit(200),
        supabase
          .from("managed_devices")
          .select("target_id, status, last_seen, last_command_poll_at")
          .limit(1000),
      ]);

      if (e1 || e2) {
        commandLive = "degraded";
      } else {
        const registeredDevices = devices ?? [];
        const onlineDevices = registeredDevices.filter(
          (d: any) => d.status === "Online" && d.last_seen && d.last_seen >= heartbeatCutoff,
        );
        const onlineSet = new Set(onlineDevices.map((d: any) => d.target_id));

        // If we have online devices, at least one of them should have polled recently.
        // No fresh polls anywhere means the command-center poller is offline.
        if (onlineDevices.length > 0) {
          const recentlyPolled = onlineDevices.some(
            (d: any) => d.last_command_poll_at && d.last_command_poll_at >= pollCutoff,
          );
          if (!recentlyPolled) commandLive = "down";
        }

        const relevant = (stuckTasks ?? []).filter((t: any) => onlineSet.has(t.target_id));
        const stuckGt10 = relevant.filter((t: any) => t.created_at < tenMinAgo).length;

        if (stuckGt10 > 0) commandLive = "down";
        else if (commandLive === "operational" && relevant.length > 5) commandLive = "degraded";
      }
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

    // ---------- Notification settings ----------
    let notifyEmails: string[] = [];
    let emailEnabled = true;
    try {
      const { data: settings } = await supabase
        .from("status_settings")
        .select("notify_emails, email_enabled")
        .eq("id", true)
        .maybeSingle();
      notifyEmails = (settings?.notify_emails ?? []).filter((e: string) => !!e);
      emailEnabled = settings?.email_enabled !== false;
    } catch (_) { /* ignore */ }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    async function sendIncidentEmails(
      incidentId: string,
      action: "opened" | "updated" | "resolved",
      payload: {
        serviceName: string;
        incidentTitle: string;
        incidentDescription?: string;
        status: string;
        impact: string;
      },
    ) {
      if (!emailEnabled || notifyEmails.length === 0) return;
      for (const recipient of notifyEmails) {
        // Idempotency: skip if already sent for this incident+action+recipient
        const { data: existing } = await supabase
          .from("status_incident_notifications")
          .select("id")
          .eq("incident_id", incidentId)
          .eq("action", action)
          .eq("recipient_email", recipient)
          .maybeSingle();
        if (existing) continue;

        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SERVICE_KEY}`,
              "apikey": SERVICE_KEY,
            },
            body: JSON.stringify({
              templateName: "incident-alert",
              recipientEmail: recipient,
              idempotencyKey: `incident-${incidentId}-${action}-${recipient}`,
              templateData: {
                ...payload,
                action,
                occurredAt: now.toISOString(),
                statusUrl: "https://rythenox-fleet-guard.lovable.app/status",
              },
            }),
          });
          if (!res.ok) {
            console.error("incident email failed", recipient, res.status, await res.text());
            continue;
          }
          await supabase.from("status_incident_notifications").insert({
            incident_id: incidentId,
            action,
            recipient_email: recipient,
          });
        } catch (e) {
          console.error("incident email exception", recipient, e);
        }
      }
    }

    // ---------- Auto-incident open/close ----------
    try {
      const { data: openAuto } = await supabase
        .from("status_incidents")
        .select("id, title, impact, affected_services")
        .is("resolved_at", null)
        .is("created_by", null)
        .ilike("title", "[Auto]%");

      const openByService = new Map<string, { id: string; title: string; impact: string }>();
      for (const inc of openAuto ?? []) {
        const token = (inc.affected_services ?? [])[0];
        if (token) openByService.set(token, { id: inc.id, title: inc.title, impact: inc.impact });
      }

      for (const d of definitions) {
        const token = (SERVICE_MATCHERS[d.name] ?? [d.name])[0];
        const open = openByService.get(token);

        if (d.live === "operational") {
          if (open) {
            await supabase
              .from("status_incidents")
              .update({ status: "resolved", resolved_at: now.toISOString() })
              .eq("id", open.id);
            await sendIncidentEmails(open.id, "resolved", {
              serviceName: d.name,
              incidentTitle: open.title,
              incidentDescription: `${d.name} has returned to operational.`,
              status: "resolved",
              impact: open.impact,
            });
          }
        } else {
          const desiredImpact = d.live === "down" ? "major" : "minor";
          if (!open) {
            const title = `[Auto] ${d.name} ${d.live === "down" ? "outage" : "degradation"} detected`;
            const description =
              "Automatically opened by the status probe. Will resolve when the service returns to operational.";
            const { data: inserted } = await supabase
              .from("status_incidents")
              .insert({
                title,
                description,
                status: "investigating",
                impact: desiredImpact,
                affected_services: [token],
                started_at: now.toISOString(),
              })
              .select("id")
              .single();
            if (inserted?.id) {
              await sendIncidentEmails(inserted.id, "opened", {
                serviceName: d.name,
                incidentTitle: title,
                incidentDescription: description,
                status: "investigating",
                impact: desiredImpact,
              });
            }
          } else if (open.impact === "minor" && desiredImpact === "major") {
            await supabase
              .from("status_incidents")
              .update({ impact: "major", status: "identified" })
              .eq("id", open.id);
            await sendIncidentEmails(open.id, "updated", {
              serviceName: d.name,
              incidentTitle: open.title,
              incidentDescription: `Severity escalated to major — ${d.name} is now down.`,
              status: "identified",
              impact: "major",
            });
          }
        }
      }
    } catch (autoErr) {
      console.error("auto-incident logic failed:", autoErr);
    }

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
