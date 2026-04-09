import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Wifi, WifiOff, RefreshCw, Headset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices } from "@/hooks/use-devices";
import { useTasks } from "@/hooks/use-tasks";

export default function Dashboard() {
  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading: devicesLoading } = useDevices(tenant?.tenantId);
  const { data: liveTasks, isLoading: tasksLoading } = useTasks(tenant?.tenantId);

  const onlineCount = liveDevices?.filter((d) => d.status === "Online").length ?? 0;
  const offlineCount = liveDevices?.filter((d) => d.status === "Offline").length ?? 0;
  const totalDevices = liveDevices?.length ?? 0;
  const pendingTasks = liveTasks?.filter((t) => t.status === "Pending").length ?? 0;

  const stats = [
    { label: "Total Devices", value: totalDevices, icon: Monitor, color: "text-accent" },
    { label: "Online", value: onlineCount, icon: Wifi, color: "text-success" },
    { label: "Offline", value: offlineCount, icon: WifiOff, color: "text-destructive" },
    { label: "Pending Tasks", value: pendingTasks, icon: RefreshCw, color: "text-warning" },
    { label: "Active Sessions", value: 0, icon: Headset, color: "text-accent" },
  ];

  const activityItems = (liveTasks || []).slice(0, 10).map((t) => ({
    id: t.id,
    action: t.command,
    target: t.target_id,
    user: "System",
    timestamp: new Date(t.created_at).toLocaleString(),
    type: t.status === "Completed" ? "deployment" : t.status === "Failed" ? "diagnostic" : "remote_session",
  }));

  const typeColors: Record<string, string> = {
    remote_session: "bg-accent/10 text-accent border-accent/30",
    deployment: "bg-success/10 text-success border-success/30",
    update: "bg-warning/10 text-warning border-warning/30",
    diagnostic: "bg-muted text-muted-foreground border-border",
  };

  const isLoading = devicesLoading || tasksLoading;

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
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : activityItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No recent activity. Tasks will appear here when you execute commands on devices.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
