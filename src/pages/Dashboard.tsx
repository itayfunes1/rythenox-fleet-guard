import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Wifi, WifiOff, Headset, Activity, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices } from "@/hooks/use-devices";
import { useTasks } from "@/hooks/use-tasks";
import { useActiveSessions } from "@/hooks/use-active-sessions";

export default function Dashboard() {
  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading: devicesLoading } = useDevices(tenant?.tenantId);
  const { data: liveTasks, isLoading: tasksLoading } = useTasks(tenant?.tenantId);
  const { data: activeSessions } = useActiveSessions(tenant?.tenantId);

  const onlineCount = liveDevices?.filter((d) => d.status === "Online").length ?? 0;
  const offlineCount = liveDevices?.filter((d) => d.status === "Offline").length ?? 0;
  const totalDevices = liveDevices?.length ?? 0;
  const activeSessionCount = activeSessions?.length ?? 0;

  const stats = [
    {
      label: "Total Devices",
      value: totalDevices,
      icon: Monitor,
      gradient: "from-primary/20 to-[hsl(260,67%,60%)]/10",
      iconColor: "text-primary",
      dotColor: "bg-primary",
    },
    {
      label: "Online",
      value: onlineCount,
      icon: Wifi,
      gradient: "from-success/20 to-success/5",
      iconColor: "text-success",
      dotColor: "bg-success",
    },
    {
      label: "Offline",
      value: offlineCount,
      icon: WifiOff,
      gradient: "from-destructive/20 to-destructive/5",
      iconColor: "text-destructive",
      dotColor: "bg-destructive",
    },
    {
      label: "Active Sessions",
      value: activeSessionCount,
      icon: Headset,
      gradient: "from-[hsl(260,67%,60%)]/20 to-primary/5",
      iconColor: "text-[hsl(260,67%,60%)]",
      dotColor: "bg-[hsl(260,67%,60%)]",
    },
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
    remote_session: "bg-primary/10 text-primary border-primary/20",
    deployment: "bg-success/10 text-success border-success/20",
    update: "bg-warning/10 text-warning border-warning/20",
    diagnostic: "bg-muted text-muted-foreground border-border",
  };

  const isLoading = devicesLoading || tasksLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[11px] font-medium text-success">Live</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Fleet overview and real-time activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card glow-card group cursor-default">
            <CardContent className="p-5 relative overflow-hidden">
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 ${stat.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <span className="text-3xl font-bold text-foreground counter-value tabular-nums">{stat.value}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/50 shimmer" />
              ))}
            </div>
          ) : activityItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Activity className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tasks will appear here when you execute commands</p>
            </div>
          ) : (
            <div className="space-y-2 stagger-children">
              {activityItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors duration-200 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline" className={`${typeColors[item.type] || typeColors.diagnostic} text-[10px] font-medium`}>
                      {item.type.replace("_", " ")}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.target}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap ml-4 tabular-nums">{item.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
