import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Globe, Server, Wifi, Users, Activity, Clock, Zap, ChevronDown, ChevronUp, ShieldAlert, Trash2, Radio, Send, AlertTriangle, Lock } from "lucide-react";
import { useRelays, type RelayNode } from "@/hooks/use-relays";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 1000) return "Just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function parseThroughput(tp: string | null): number {
  if (!tp) return 0;
  const match = tp.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GB") return val * 1024;
  if (unit === "MB") return val;
  if (unit === "KB") return val / 1024;
  return val / (1024 * 1024);
}

export default function NetworkInfrastructure() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: relays, isLoading } = useRelays(tenant?.tenantId);
  const { toast } = useToast();
  const [expandedRelay, setExpandedRelay] = useState<string | null>(null);
  const [broadcastCmd, setBroadcastCmd] = useState("");
  const [adminLoading, setAdminLoading] = useState<string | null>(null);

  const isRythenox = user?.email?.endsWith("@rythenox.com");

  // Access guard
  if (!isRythenox) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">
              The Network Infrastructure page is restricted to authorized Rythenox personnel only.
            </p>
            <Badge variant="outline" className="text-xs border-destructive/20 text-destructive">
              {user?.email || "Unknown user"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRelayOnline = (r: RelayNode) => {
    if (r.status !== "Online") return false;
    if (!r.last_seen) return false;
    return Date.now() - new Date(r.last_seen).getTime() < 90_000;
  };

  const onlineCount = relays?.filter(isRelayOnline).length ?? 0;
  const totalCount = relays?.length ?? 0;
  const totalClients = relays?.reduce((sum, r) => sum + r.client_count, 0) ?? 0;
  const peakClients = relays?.reduce((max, r) => Math.max(max, r.client_count), 0) ?? 0;
  const avgUptime = totalCount > 0 ? Math.floor((relays?.reduce((sum, r) => sum + r.uptime, 0) ?? 0) / totalCount) : 0;
  const totalThroughputMB = relays?.reduce((sum, r) => sum + parseThroughput(r.throughput), 0) ?? 0;
  const healthPercent = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

  const stats = [
    { label: "Relay Nodes", value: totalCount, sub: `${onlineCount} online`, icon: Server, gradient: "from-primary/20 to-[hsl(260,67%,60%)]/10", iconColor: "text-primary" },
    { label: "Active Bridges", value: totalClients, sub: `Peak: ${peakClients}`, icon: Users, gradient: "from-[hsl(260,67%,60%)]/20 to-primary/5", iconColor: "text-[hsl(260,67%,60%)]" },
    { label: "Avg Uptime", value: formatUptime(avgUptime), sub: "across all relays", icon: Clock, gradient: "from-success/20 to-success/5", iconColor: "text-success" },
    { label: "Throughput", value: totalThroughputMB >= 1024 ? `${(totalThroughputMB / 1024).toFixed(1)} GB` : `${totalThroughputMB.toFixed(1)} MB`, sub: "aggregated", icon: Activity, gradient: "from-warning/20 to-warning/5", iconColor: "text-warning" },
    { label: "Network Health", value: `${healthPercent}%`, sub: `${onlineCount}/${totalCount} nodes`, icon: Wifi, gradient: "from-success/20 to-success/5", iconColor: "text-success" },
  ];

  const adminAction = async (action: string, relayId?: string) => {
    setAdminLoading(action + (relayId || ""));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("relay-admin", {
        body: { action, relay_id: relayId, tenant_id: tenant?.tenantId, command: broadcastCmd || undefined },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      toast({ title: "Success", description: res.data?.message || "Action completed" });
      if (action === "broadcast_command") setBroadcastCmd("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Admin action failed", variant: "destructive" });
    } finally {
      setAdminLoading(null);
    }
  };

  // Group by IP prefix (first 3 octets)
  const ipGroups: Record<string, RelayNode[]> = {};
  relays?.forEach((r) => {
    const prefix = r.addr.split(":")[0].split(".").slice(0, 3).join(".") + ".x";
    if (!ipGroups[prefix]) ipGroups[prefix] = [];
    ipGroups[prefix].push(r);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Network Infrastructure</h1>
          <p className="text-sm text-muted-foreground">Relay nodes, network telemetry & admin controls</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[11px] font-medium text-success">Real-time</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 stagger-children">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card glow-card group cursor-default">
            <CardContent className="p-4 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <div className={`h-7 w-7 rounded-lg border border-border flex items-center justify-center ${stat.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-foreground tabular-nums">{stat.value}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Network Health Bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Network Health</span>
            <span className="text-xs font-bold text-foreground">{healthPercent}%</span>
          </div>
          <Progress value={healthPercent} className="h-2" />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">{onlineCount} online</span>
            <span className="text-[10px] text-muted-foreground">{totalCount - onlineCount} offline</span>
          </div>
        </CardContent>
      </Card>

      {/* Relay Table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Relay Nodes</CardTitle>
            <Badge variant="outline" className="text-[10px] ml-auto">{totalCount} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/30 shimmer" />
              ))}
            </div>
          ) : !relays?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Globe className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No relay nodes reporting</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Data will appear here once your Go infrastructure sends heartbeats</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  {["", "Address", "Status", "Throughput", "Uptime", "Last Seen"].map((h) => (
                     <TableHead key={h} className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {relays.map((relay) => {
                  const online = isRelayOnline(relay);
                  const expanded = expandedRelay === relay.id;
                  return (
                    <>
                      <TableRow
                        key={relay.id}
                        className="border-border/20 table-row-hover cursor-pointer"
                        onClick={() => setExpandedRelay(expanded ? null : relay.id)}
                      >
                        <TableCell className="w-8">
                          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{relay.addr}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] rounded-full ${online ? "border-success/20 bg-success/10 text-success" : "border-muted bg-muted/50 text-muted-foreground"}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${online ? "bg-success" : "bg-muted-foreground/50"}`} />
                            {online ? "Online" : "Offline"}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-muted-foreground">{relay.throughput ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{formatUptime(relay.uptime)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground" title={relay.last_seen ? new Date(relay.last_seen).toLocaleString() : undefined}>
                            {timeAgo(relay.last_seen)}
                          </span>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow key={`${relay.id}-detail`} className="border-border/10 bg-muted/20">
                          <TableCell colSpan={6}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 px-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Relay ID</p>
                                <p className="text-xs font-mono text-foreground truncate">{relay.id}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Exact Uptime</p>
                                <p className="text-xs text-foreground tabular-nums">{relay.uptime.toLocaleString()}s</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Seen (UTC)</p>
                                <p className="text-xs text-foreground">{relay.last_seen ? new Date(relay.last_seen).toISOString() : "Never"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">IP Subnet</p>
                                <p className="text-xs font-mono text-foreground">{relay.addr.split(":")[0].split(".").slice(0, 3).join(".")}.0/24</p>
                              </div>
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Health</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={online ? 100 : 0} className="h-1.5 flex-1" />
                                  <span className={`text-[10px] font-medium ${online ? "text-success" : "text-destructive"}`}>{online ? "Healthy" : "Down"}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* IP Subnet Groups */}
      {Object.keys(ipGroups).length > 1 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Subnet Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(ipGroups).map(([prefix, nodes]) => {
                const subOnline = nodes.filter(isRelayOnline).length;
                return (
                  <div key={prefix} className="rounded-lg border border-border/30 p-3 bg-muted/20">
                    <p className="text-xs font-mono text-foreground mb-1">{prefix}</p>
                    <p className="text-[10px] text-muted-foreground">{nodes.length} nodes · {subOnline} online</p>
                    <Progress value={nodes.length > 0 ? (subOnline / nodes.length) * 100 : 0} className="h-1 mt-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
