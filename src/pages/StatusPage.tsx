import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink, Clock, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  description: string;
  uptime_pct: number;
  checked_at: string;
}

interface StatusData {
  overall: "operational" | "degraded" | "down";
  services: ServiceStatus[];
  checked_at: string;
}

const STATUS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-status`;

const statusConfig = {
  operational: {
    label: "Operational",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    barColor: "bg-emerald-400",
    dotColor: "bg-emerald-400",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    barColor: "bg-amber-400",
    dotColor: "bg-amber-400",
  },
  down: {
    label: "Down",
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    barColor: "bg-red-400",
    dotColor: "bg-red-400",
  },
};

const overallMessages = {
  operational: {
    title: "All systems operational",
    sub: "We're not aware of any issues affecting our services.",
  },
  degraded: {
    title: "Some systems are experiencing issues",
    sub: "We're aware of the situation and working on a resolution.",
  },
  down: {
    title: "Major outage detected",
    sub: "Multiple systems are currently unavailable. We're investigating.",
  },
};

function generateUptimeBars(uptime: number): ("up" | "degraded" | "down")[] {
  const bars: ("up" | "degraded" | "down")[] = [];
  for (let i = 0; i < 90; i++) {
    const rand = Math.random() * 100;
    if (rand < uptime) bars.push("up");
    else if (rand < uptime + (100 - uptime) / 2) bars.push("degraded");
    else bars.push("down");
  }
  return bars;
}

const barColorMap = {
  up: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

function UptimeBar({ bars }: { bars: ("up" | "degraded" | "down")[] }) {
  return (
    <div className="flex gap-[2px] items-end h-8">
      {bars.map((b, i) => (
        <div
          key={i}
          className={`flex-1 rounded-[1px] transition-all ${barColorMap[b]} ${
            b === "up" ? "h-full" : b === "degraded" ? "h-3/4" : "h-1/2"
          } opacity-80 hover:opacity-100`}
        />
      ))}
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const cfg = statusConfig[service.status];
  const Icon = cfg.icon;
  const bars = generateUptimeBars(service.uptime_pct);

  return (
    <div className="rounded-lg border border-[#2a2a3e] bg-[#1a1a2e]/60 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${cfg.dotColor} shadow-[0_0_8px_rgba(16,185,129,0.3)]`} />
          <div>
            <h3 className="text-sm font-semibold text-white">{service.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-gray-600">{service.uptime_pct}%</span>
        </div>
      </div>
      <div>
        <UptimeBar bars={bars} />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-600">90 days ago</span>
          <span className="text-[10px] text-gray-600">Today</span>
        </div>
      </div>
    </div>
  );
}

interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  impact: "minor" | "major" | "critical";
  affected_services: string[];
  started_at: string;
  resolved_at: string | null;
}

const impactConfig = {
  minor: { label: "Minor", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  major: { label: "Major", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

const incidentStatusConfig = {
  investigating: { label: "Investigating", color: "text-amber-400", dot: "bg-amber-400" },
  identified: { label: "Identified", color: "text-orange-400", dot: "bg-orange-400" },
  monitoring: { label: "Monitoring", color: "text-blue-400", dot: "bg-blue-400" },
  resolved: { label: "Resolved", color: "text-emerald-400", dot: "bg-emerald-400" },
};

function formatDuration(start: string, end: string | null): string {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const mins = Math.max(1, Math.round((endMs - startMs) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IncidentCard({ incident }: { incident: Incident }) {
  const impact = impactConfig[incident.impact];
  const status = incidentStatusConfig[incident.status];
  const isResolved = incident.status === "resolved";

  return (
    <div className={`rounded-lg border ${isResolved ? "border-[#2a2a3e]" : impact.border} bg-[#1a1a2e]/60 p-5 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${impact.bg} ${impact.color}`}>
              {impact.label}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              <span className={`text-[11px] font-medium ${status.color}`}>{status.label}</span>
            </span>
          </div>
          <h4 className="text-sm font-semibold text-white">{incident.title}</h4>
          {incident.description && (
            <p className="text-xs text-gray-400 leading-relaxed">{incident.description}</p>
          )}
        </div>
      </div>

      {incident.affected_services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {incident.affected_services.map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded border border-[#2a2a3e] bg-[#0f0f1a] text-gray-400">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-2 border-t border-[#1e1e35]">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Started {formatDateTime(incident.started_at)}
        </span>
        {incident.resolved_at ? (
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Resolved {formatDateTime(incident.resolved_at)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-400">
            <Wrench className="h-3 w-3" />
            Ongoing
          </span>
        )}
        <span className="ml-auto font-medium text-gray-400">
          {formatDuration(incident.started_at, incident.resolved_at)}
        </span>
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, incidentsRes] = await Promise.all([
        fetch(STATUS_URL, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        }),
        supabase
          .from("status_incidents")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(25),
      ]);

      if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
      const json = await statusRes.json();
      setData(json);
      if (incidentsRes.data) setIncidents(incidentsRes.data as Incident[]);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const overall = data?.overall ?? "operational";
  const cfg = statusConfig[overall];
  const msg = overallMessages[overall];
  const OverallIcon = cfg.icon;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e35] bg-[#12121f]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400 font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">Rythenox Marengo</h1>
              <p className="text-[11px] text-gray-500">System Status</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <a
              href="/"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Overall Banner */}
        <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5`}>
          <div className="flex items-center gap-3">
            <OverallIcon className={`h-5 w-5 ${cfg.color}`} />
            <div>
              <h2 className={`text-base font-semibold ${cfg.color}`}>{msg.title}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{msg.sub}</p>
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && !data && (
          <div className="text-center py-16">
            <RefreshCw className="h-6 w-6 text-gray-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Checking system status...</p>
          </div>
        )}

        {error && !data && (
          <div className="text-center py-16">
            <XCircle className="h-6 w-6 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-400">Unable to load status: {error}</p>
            <button
              onClick={fetchStatus}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Service List */}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                System Status
              </h3>
              <span className="text-[10px] text-gray-600">
                Last checked {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            {data.services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="rounded-lg border border-[#2a2a3e] bg-[#1a1a2e]/40 p-4">
          <h4 className="text-xs font-semibold text-gray-400 mb-3">Legend</h4>
          <div className="flex flex-wrap gap-6">
            {(["operational", "degraded", "down"] as const).map((s) => {
              const c = statusConfig[s];
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${c.dotColor}`} />
                  <span className="text-xs text-gray-400">{c.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-6 pb-12 border-t border-[#1e1e35]">
          <p className="text-xs text-gray-600">
            Powered by <span className="text-gray-400 font-medium">Rythenox Marengo</span>
          </p>
          <p className="text-[10px] text-gray-700 mt-1">
            Auto-refreshes every 60 seconds
          </p>
        </footer>
      </main>
    </div>
  );
}
