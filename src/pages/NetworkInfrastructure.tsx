import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Server, Wifi, Clock, ArrowUpDown, Users } from "lucide-react";
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
    return Date.now() - new Date(r.last_seen).getTime() < 90_000; // 90s threshold
  };

  const onlineCount = relays?.filter(isRelayOnline).length ?? 0;
  const totalClients = relays?.reduce((sum, r) => sum + r.client_count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Network Infrastructure</h1>
        <p className="text-sm text-muted-foreground">Relay nodes and network telemetry</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Relay Nodes</CardTitle>
            <Server className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{relays?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">{onlineCount} online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Bridges</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalClients}</div>
            <p className="text-xs text-muted-foreground">across all relays</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <Wifi className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {onlineCount > 0 ? "Operational" : "No Nodes"}
            </div>
            <p className="text-xs text-muted-foreground">network health</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" /> Relay Nodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading relay data…</p>
          ) : !relays?.length ? (
            <p className="text-sm text-muted-foreground">
              No relay nodes reporting. Data will appear here once your Go infrastructure sends heartbeats to the relay-heartbeat edge function.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bridges</TableHead>
                  <TableHead>Throughput</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relays.map((relay) => (
                  <TableRow key={relay.id}>
                    <TableCell className="font-mono text-sm">{relay.addr}</TableCell>
                    <TableCell>
                      <Badge variant={relay.status === "Online" ? "default" : "secondary"}>
                        {relay.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{relay.client_count}</TableCell>
                    <TableCell>{relay.throughput ?? "—"}</TableCell>
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
