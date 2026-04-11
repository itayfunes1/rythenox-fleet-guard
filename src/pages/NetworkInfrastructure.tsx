import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Server, Wifi, Users } from "lucide-react";
import { useRelays, type RelayNode } from "@/hooks/use-relays";
import { useTenant } from "@/hooks/use-tenant";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function NetworkInfrastructure() {
  const { data: tenant } = useTenant();
  const { data: relays, isLoading } = useRelays(tenant?.tenantId);

  const isRelayOnline = (r: RelayNode) => {
    if (r.status !== "Online") return false;
    if (!r.last_seen) return false;
    return Date.now() - new Date(r.last_seen).getTime() < 90_000;
  };

  const onlineCount = relays?.filter(isRelayOnline).length ?? 0;
  const totalClients = relays?.reduce((sum, r) => sum + r.client_count, 0) ?? 0;

  const stats = [
    { label: "Relay Nodes", value: relays?.length ?? 0, sub: `${onlineCount} online`, icon: Server, gradient: "from-primary/20 to-[hsl(260,67%,60%)]/10", iconColor: "text-primary" },
    { label: "Active Bridges", value: totalClients, sub: "across all relays", icon: Users, gradient: "from-[hsl(260,67%,60%)]/20 to-primary/5", iconColor: "text-[hsl(260,67%,60%)]" },
    { label: "Status", value: onlineCount > 0 ? "Operational" : "No Nodes", sub: "network health", icon: Wifi, gradient: "from-success/20 to-success/5", iconColor: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Network Infrastructure</h1>
        <p className="text-sm text-muted-foreground">Relay nodes and network telemetry</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card glow-card group cursor-default">
            <CardContent className="p-5 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <div className={`h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center ${stat.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Relay Nodes</CardTitle>
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
                  {["Address", "Status", "Bridges", "Throughput", "Uptime", "Last Seen"].map((h) => (
                    <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {relays.map((relay) => (
                  <TableRow key={relay.id} className="border-border/20 table-row-hover">
                    <TableCell className="font-mono text-sm">{relay.addr}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] rounded-full ${isRelayOnline(relay) ? "border-success/20 bg-success/10 text-success" : "border-muted bg-muted/50 text-muted-foreground"}`}>
                        {isRelayOnline(relay) ? "Online" : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell>{relay.client_count}</TableCell>
                    <TableCell className="text-muted-foreground">{relay.throughput ?? "—"}</TableCell>
                    <TableCell>{formatUptime(relay.uptime)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {relay.last_seen ? new Date(relay.last_seen).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
