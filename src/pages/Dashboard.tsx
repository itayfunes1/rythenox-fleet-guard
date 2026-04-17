import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Monitor, Wifi, WifiOff, Activity, Rocket, FolderArchive, Network,
  TrendingUp, ChevronRight, BarChart3, Shield, Server, Zap, Flame, Layers, Globe,
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices } from "@/hooks/use-devices";
import { useTasks } from "@/hooks/use-tasks";
import { useRelays } from "@/hooks/use-relays";
import { useActiveSessions } from "@/hooks/use-active-sessions";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { isDeviceResponsive } from "@/lib/device-presence";
import { LivePulseStrip } from "@/components/dashboard/LivePulseStrip";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { SmartInsights, type Insight } from "@/components/dashboard/SmartInsights";
import { CommandTypeBreakdown } from "@/components/dashboard/CommandTypeBreakdown";
import { EventStream, type StreamEvent } from "@/components/dashboard/EventStream";
import { DistributionPanel } from "@/components/dashboard/DistributionPanel";

function detectOsFamily(os: string | null): string {
  if (!os) return "Unknown";
  const s = os.toLowerCase();
  if (s.includes("win")) return "Windows";
  if (s.includes("darwin") || s.includes("mac")) return "macOS";
  if (s.includes("linux") || s.includes("ubuntu") || s.includes("debian") || s.includes("centos")) return "Linux";
  return "Other";
}

function commandRoot(cmd: string): string {
  const trimmed = cmd.trim();
  if (!trimmed) return "(empty)";
  const first = trimmed.split(/[\s|;&]/)[0];
  return (first || "(empty)").slice(0, 24);
}

function subnet24(ip: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const tenantId = tenant?.tenantId;
  const { data: liveDevices, isLoading: devicesLoading } = useDevices(tenantId);
  const { data: liveTasks, isLoading: tasksLoading } = useTasks(tenantId);
  const { data: relays } = useRelays(tenantId);
  const { data: sessions } = useActiveSessions(tenantId);
  const navigate = useNavigate();

  const devices = liveDevices || [];
  const tasks = liveTasks || [];
  const relayList = relays || [];

  const onlineCount = devices.filter((d) => d.status === "Online").length;
  const offlineCount = devices.filter((d) => d.status === "Offline").length;
  const totalDevices = devices.length;
  const healthPercent = totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 100) : 0;

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const pendingTasks = tasks.filter((t) => t.status === "Pending" || t.status === "Sent").length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const failedTasks = tasks.filter((t) => t.status === "Failed").length;
  const finishedTotal = completedTasks + failedTasks;
  const successRate = finishedTotal > 0 ? Math.round((completedTasks / finishedTotal) * 100) : 100;

  const isLoading = devicesLoading || tasksLoading;

  // ============== DERIVED INTELLIGENCE ==============
  const now = Date.now();
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  // Tasks in last hour
  const commandsLastHour = useMemo(
    () => tasks.filter((t) => now - new Date(t.created_at).getTime() < HOUR).length,
    [tasks, now]
  );

  // Sparkline: device count by day for last 7 days (rough — based on most recent task target_id seen per day proxy = devices count snapshot only).
  // We'll instead show task volume per day for the device card sparkline.
  const taskVolume7d = useMemo(() => {
    const buckets = new Array(7).fill(0);
    tasks.forEach((t) => {
      const ageDays = Math.floor((now - new Date(t.created_at).getTime()) / DAY);
      if (ageDays >= 0 && ageDays < 7) buckets[6 - ageDays]++;
    });
    return buckets;
  }, [tasks, now]);

  // Hourly heatmap (last 24h, indexed by clock hour)
  const hourlyActivity = useMemo(() => {
    const buckets = new Array(24).fill(0);
    tasks.forEach((t) => {
      const ts = new Date(t.created_at).getTime();
      if (now - ts < 24 * HOUR) {
        buckets[new Date(ts).getHours()]++;
      }
    });
    return buckets;
  }, [tasks, now]);

  // Top device by command volume (today)
  const topDeviceToday = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((t) => {
      if (now - new Date(t.created_at).getTime() < DAY) {
        counts.set(t.target_id, (counts.get(t.target_id) || 0) + 1);
      }
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  }, [tasks, now]);

  // Longest-offline device
  const longestOffline = useMemo(() => {
    return devices
      .filter((d) => d.status === "Offline" && d.last_seen)
      .sort((a, b) => new Date(a.last_seen!).getTime() - new Date(b.last_seen!).getTime())[0] || null;
  }, [devices]);

  // Command type breakdown (top 5)
  const commandBuckets = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      const k = commandRoot(t.command);
      map.set(k, (map.get(k) || 0) + 1);
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4).map(([name, count]) => ({ name, count }));
    const rest = sorted.slice(4).reduce((s, [, c]) => s + c, 0);
    if (rest > 0) top.push({ name: "other", count: rest });
    return top;
  }, [tasks]);

  // OS distribution
  const osDistribution = useMemo(() => {
    const map = new Map<string, number>();
    devices.forEach((d) => {
      const fam = detectOsFamily(d.os_info);
      map.set(fam, (map.get(fam) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [devices]);

  // Subnet distribution (top 4)
  const subnetDistribution = useMemo(() => {
    const map = new Map<string, number>();
    devices.forEach((d) => {
      const s = subnet24(d.public_ip);
      if (s) map.set(s, (map.get(s) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [devices]);

  // Smart insights
  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];

    const stale = devices.filter((d) => d.last_seen && now - new Date(d.last_seen).getTime() > DAY);
    if (stale.length > 0) {
      out.push({
        id: "stale-devices",
        severity: stale.length >= 3 ? "warning" : "info",
        title: `${stale.length} device${stale.length === 1 ? "" : "s"} offline for >24h`,
        detail: "Consider investigating connectivity or decommissioning.",
      });
    }

    if (finishedTotal >= 5) {
      out.push({
        id: "success-rate",
        severity: successRate >= 90 ? "success" : successRate >= 70 ? "info" : "warning",
        title: `Task success rate: ${successRate}%`,
        detail: `${completedTasks} completed · ${failedTasks} failed of last ${finishedTotal} executed.`,
      });
    }

    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const peakCount = hourlyActivity[peakHour];
    if (peakCount >= 3) {
      out.push({
        id: "peak-hour",
        severity: "info",
        title: `Peak activity at ${peakHour.toString().padStart(2, "0")}:00`,
        detail: `${peakCount} commands executed during this hour.`,
      });
    }

    if (topDeviceToday && topDeviceToday[1] >= 3) {
      out.push({
        id: "top-device",
        severity: "info",
        title: `Most active: ${topDeviceToday[0]}`,
        detail: `${topDeviceToday[1]} commands today.`,
      });
    }

    if (totalDevices > 0 && healthPercent < 50) {
      out.push({
        id: "fleet-degraded",
        severity: "critical",
        title: `Fleet health critical (${healthPercent}%)`,
        detail: `Only ${onlineCount} of ${totalDevices} devices responding.`,
      });
    }

    const onlineRelays = relayList.filter((r) => isDeviceResponsive(r.status, r.last_seen, now)).length;
    if (relayList.length > 0 && onlineRelays < relayList.length) {
      out.push({
        id: "relay-degraded",
        severity: "warning",
        title: `${relayList.length - onlineRelays} relay node${relayList.length - onlineRelays === 1 ? "" : "s"} offline`,
        detail: `${onlineRelays}/${relayList.length} nodes operational.`,
      });
    }

    return out.slice(0, 6);
  }, [devices, hourlyActivity, topDeviceToday, finishedTotal, successRate, completedTasks, failedTasks, totalDevices, healthPercent, onlineCount, relayList, now]);

  // Top devices leaderboard (by command count today)
  const topDevices = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((t) => {
      if (now - new Date(t.created_at).getTime() < DAY) {
        counts.set(t.target_id, (counts.get(t.target_id) || 0) + 1);
      }
    });
    return [...counts.entries()]
      .map(([target_id, count]) => ({ target_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tasks, now]);

  // Real-time event stream (merged)
  const events = useMemo<StreamEvent[]>(() => {
    const out: StreamEvent[] = [];

    tasks.slice(0, 30).forEach((t) => {
      const type: StreamEvent["type"] =
        t.status === "Completed" ? "task-completed" :
        t.status === "Failed" ? "task-failed" :
        t.status === "Sent" ? "task-sent" : "task-pending";
      out.push({
        id: `t-${t.id}`,
        type,
        title: t.command.length > 60 ? t.command.slice(0, 60) + "…" : t.command,
        subtitle: `${t.target_id} · ${t.status}`,
        timestamp: t.created_at,
      });
    });

    devices.slice(0, 10).forEach((d) => {
      if (d.status === "Online" && d.last_seen) {
        out.push({
          id: `d-on-${d.id}`,
          type: "device-online",
          title: `${d.target_id} came online`,
          subtitle: `${detectOsFamily(d.os_info)} · ${d.public_ip || "unknown ip"}`,
          timestamp: d.last_seen,
        });
      }
    });

    (sessions || []).forEach((s) => {
      out.push({
        id: `s-${s.id}`,
        type: "session-open",
        title: `Terminal session opened`,
        subtitle: s.target_id,
        timestamp: s.created_at,
      });
    });

    return out
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 25);
  }, [tasks, devices, sessions]);

  const recentDevices = devices.slice(0, 5);
  const onlineRelays = relayList.filter((r) => isDeviceResponsive(r.status, r.last_seen)).length;
  const lastHeartbeat = devices[0]?.last_seen || null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's what's happening with your fleet today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/8 border border-success/15">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
            </span>
            <span className="text-[11px] font-medium text-success">System Operational</span>
          </div>
        </div>
      </div>

      {/* Live Pulse Strip */}
      <LivePulseStrip
        commandsLastHour={commandsLastHour}
        activeSessions={sessions?.length ?? 0}
        onlineRelays={onlineRelays}
        totalRelays={relayList.length}
        lastHeartbeat={lastHeartbeat}
      />

      {/* KPI Row — now smarter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Devices</span>
              <div className="h-8 w-8 rounded-md bg-primary/8 flex items-center justify-center">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{totalDevices}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Task volume / 7d</p>
              </div>
              <Sparkline data={taskVolume7d} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Online</span>
              <div className="h-8 w-8 rounded-md bg-success/8 flex items-center justify-center">
                <Wifi className="h-4 w-4 text-success" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{onlineCount}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-[11px] text-success font-medium">{healthPercent}% fleet health</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Offline</span>
              <div className="h-8 w-8 rounded-md bg-destructive/8 flex items-center justify-center">
                <WifiOff className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{offlineCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {longestOffline ? <>Top: <span className="font-mono">{longestOffline.target_id}</span></> : "All responsive"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success Rate</span>
              <div className="h-8 w-8 rounded-md bg-warning/8 flex items-center justify-center">
                <Activity className="h-4 w-4 text-warning" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{successRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              {pendingTasks} pending · {failedTasks} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Smart Insights */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Smart Insights</CardTitle>
                  <Badge variant="outline" className="text-[10px] ml-1">{insights.length}</Badge>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-generated</span>
              </div>
            </CardHeader>
            <CardContent>
              <SmartInsights insights={insights} />
            </CardContent>
          </Card>

          {/* Activity Heatmap + Fleet Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">24h Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ActivityHeatmap hourly={hourlyActivity} />
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Fleet Health</CardTitle>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${healthPercent >= 80 ? "border-success/20 text-success bg-success/5" : healthPercent >= 50 ? "border-warning/20 text-warning bg-warning/5" : "border-destructive/20 text-destructive bg-destructive/5"}`}>
                    {healthPercent >= 80 ? "Healthy" : healthPercent >= 50 ? "Degraded" : "Critical"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Device availability</span>
                    <span className="font-semibold text-foreground tabular-nums">{healthPercent}%</span>
                  </div>
                  <Progress value={healthPercent} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-base font-bold text-foreground tabular-nums">{completedTasks}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Done</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-base font-bold text-foreground tabular-nums">{pendingTasks}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Pending</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-base font-bold text-foreground tabular-nums">{failedTasks}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Failed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Inventory */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Device Inventory</CardTitle>
                  <Badge variant="outline" className="text-[10px] ml-1">{totalDevices}</Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/devices")}>
                  View All <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />)}
                </div>
              ) : recentDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Monitor className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No devices registered</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Devices will appear once agents start reporting</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Device</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">OS</TableHead>
                      <TableHead className="hidden lg:table-cell text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">IP Address</TableHead>
                      <TableHead className="hidden lg:table-cell text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDevices.map((device) => (
                      <TableRow
                        key={device.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate("/devices")}
                      >
                        <TableCell className="font-mono text-sm font-medium">{device.target_id}</TableCell>
                        <TableCell><StatusBadge status={device.status === "Online" ? "online" : "offline"} /></TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{device.os_info || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground">{device.public_ip || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {device.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Top Devices + Command Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Top Devices Today</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {topDevices.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No commands today</p>
                ) : (
                  <div className="space-y-2">
                    {topDevices.map((d, i) => (
                      <div key={d.target_id} className="flex items-center justify-between gap-3 py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="h-5 w-5 rounded-md bg-primary/8 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                            {i + 1}
                          </span>
                          <span className="text-xs font-mono text-foreground truncate">{d.target_id}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary/70" style={{ width: `${(d.count / topDevices[0].count) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-foreground tabular-nums w-6 text-right">{d.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Command Types</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CommandTypeBreakdown buckets={commandBuckets} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickAction icon={Monitor} title="Device Management" desc="Terminal & remote access" onClick={() => navigate("/devices")} />
              <QuickAction icon={Rocket} title="Deploy Agent" desc="Build & download binaries" onClick={() => navigate("/deployment")} />
              <QuickAction icon={FolderArchive} title="File Explorer" desc="Files & telemetry data" onClick={() => navigate("/diagnostics")} />
              <QuickAction icon={Network} title="Network Infra" desc="Relay nodes & health" onClick={() => navigate("/network")} />
            </CardContent>
          </Card>

          {/* Real-Time Event Stream */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Live Event Stream</CardTitle>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                  LIVE
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />)}
                </div>
              ) : (
                <EventStream events={events} />
              )}
            </CardContent>
          </Card>

          {/* OS / Network Distribution */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Fleet Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">OS Family</p>
                <DistributionPanel items={osDistribution} total={totalDevices} emptyLabel="No OS data" />
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Network Subnets</p>
                <DistributionPanel items={subnetDistribution} total={subnetDistribution.reduce((s, i) => s + i.count, 0)} emptyLabel="No IP data" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="h-9 w-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </button>
  );
}
