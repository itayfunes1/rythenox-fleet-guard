import { networkNodes } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Globe, Server, Wifi, ArrowUpDown } from "lucide-react";

export default function NetworkInfrastructure() {
  const vpns = networkNodes.filter((n) => n.type === "vpn_concentrator");
  const gateways = networkNodes.filter((n) => n.type === "management_gateway");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Network Infrastructure</h1>
        <p className="text-sm text-muted-foreground">VPN concentrators and management gateways</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" /> VPN Concentrators
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vpns.map((node) => (
            <Card key={node.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{node.name}</CardTitle>
                  <StatusBadge status={node.status} />
                </div>
                <p className="text-xs text-muted-foreground">{node.location}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Connections:</span>
                  </div>
                  <span className="font-medium text-right">{node.connections}/{node.maxConnections}</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Throughput:</span>
                  </div>
                  <span className="font-medium text-right">{node.throughput}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Capacity</span>
                    <span>{Math.round((node.connections / node.maxConnections) * 100)}%</span>
                  </div>
                  <Progress value={(node.connections / node.maxConnections) * 100} className="h-1.5" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>IP: {node.ip}</span>
                  <span>Uptime: {node.uptime}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-accent" /> Management Gateways
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {gateways.map((node) => (
            <Card key={node.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{node.name}</CardTitle>
                  <StatusBadge status={node.status} />
                </div>
                <p className="text-xs text-muted-foreground">{node.location}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Connections:</span>
                  </div>
                  <span className="font-medium text-right">{node.connections}/{node.maxConnections}</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Throughput:</span>
                  </div>
                  <span className="font-medium text-right">{node.throughput}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>IP: {node.ip}</span>
                  <span>Uptime: {node.uptime}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
