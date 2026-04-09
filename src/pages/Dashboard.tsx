import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Wifi, WifiOff, RefreshCw, Headset } from "lucide-react";
import { devices as mockDevices, recentActivity } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices } from "@/hooks/use-devices";
import { useTasks } from "@/hooks/use-tasks";

export default function Dashboard() {
  const { data: tenant } = useTenant();
  const { data: liveDevices } = useDevices(tenant?.tenantId);
  const { data: liveTasks } = useTasks(tenant?.tenantId);

  // Use live data if tenant is connected, otherwise mock
  const hasLiveData = !!tenant?.tenantId && !!liveDevices;

  const onlineCount = hasLiveData
    ? liveDevices.filter((d) => d.status === "Online").length
    : mockDevices.filter((d) => d.status === "online").length;
  const offlineCount = hasLiveData
    ? liveDevices.filter((d) => d.status === "Offline").length
    : mockDevices.filter((d) => d.status === "offline").length;
  const totalDevices = hasLiveData ? liveDevices.length : mockDevices.length;
  const pendingTasks = liveTasks?.filter((t) => t.status === "Pending").length ?? 5;

  const stats = [
    { label: "Total Devices", value: totalDevices, icon: Monitor, color: "text-accent" },
    { label: "Online", value: onlineCount, icon: Wifi, color: "text-success" },
    { label: "Offline", value: offlineCount, icon: WifiOff, color: "text-destructive" },
    { label: "Pending Tasks", value: pendingTasks, icon: RefreshCw, color: "text-warning" },
    { label: "Active Sessions", value: 1, icon: Headset, color: "text-accent" },
  ];

  // Build activity feed from live tasks or fall back to mock
  const activityItems = liveTasks && liveTasks.length > 0
    ? liveTasks.slice(0, 6).map((t) => ({
        id: t.id,
        action: t.command,
        target: t.target_id,
        user: "System",
        timestamp: new Date(t.created_at).toLocaleString(),
        type: t.status === "Completed" ? "deployment" : t.status === "Failed" ? "diagnostic" : "remote_session",
      }))
    : recentActivity;

  const typeColors: Record<string, string> = {
    remote_session: "bg-accent/10 text-accent border-accent/30",
    deployment: "bg-success/10 text-success border-success/30",
    update: "bg-warning/10 text-warning border-warning/30",
    diagnostic: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fleet overview and recent activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className={typeColors[item.type] || typeColors.diagnostic}>
                    {item.type.replace("_", " ")}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.target} · {item.user}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
