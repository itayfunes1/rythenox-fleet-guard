import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Server } from "lucide-react";

export default function NetworkInfrastructure() {
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
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No VPN concentrators configured. Network infrastructure data will appear here once connected.</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-accent" /> Management Gateways
        </h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No management gateways configured. Gateway data will appear here once connected.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
