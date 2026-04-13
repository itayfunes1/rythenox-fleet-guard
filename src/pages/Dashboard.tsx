import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Wifi, WifiOff, Activity, ArrowUpRight, Rocket, FolderArchive, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices } from "@/hooks/use-devices";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading: devicesLoading } = useDevices(tenant?.tenantId);
  const { data: liveTasks, isLoading: tasksLoading } = useTasks(tenant?.tenantId);
  
  const navigate = useNavigate();

  const onlineCount = liveDevices?.filter((d) => d.status === "Online").length ?? 0;
  const offlineCount = liveDevices?.filter((d) => d.status === "Offline").length ?? 0;
  const totalDevices = liveDevices?.length ?? 0;

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const stats = [
    { label: "Total Devices", value: totalDevices, icon: Monitor, iconColor: "text-primary", bgColor: "bg-primary/8" },
    { label: "Online", value: onlineCount, icon: Wifi, iconColor: "text-success", bgColor: "bg-success/8" },
    { label: "Offline", value: offlineCount, icon: WifiOff, iconColor: "text-destructive", bgColor: "bg-destructive/8" },
  ];

  const quickActions = [
    { label: "Deployment Center", desc: "Build & deploy agents", icon: Rocket, path: "/deployment", color: "text-primary" },
    { label: "File Explorer", desc: "View diagnostic files", icon: FolderArchive, path: "/diagnostics", color: "text-muted-foreground" },
    { label: "Network", desc: "Relay infrastructure", icon: Network, path: "/network", color: "text-success" },
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
    remote_session: "bg-primary/8 text-primary border-primary/15",
    deployment: "bg-success/8 text-success border-success/15",
    update: "bg-warning/8 text-warning border-warning/15",
    diagnostic: "bg-muted text-muted-foreground border-border",
  };

  const isLoading = devicesLoading || tasksLoading;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Welcome back, <span className="text-primary">{firstName}</span>
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/8 border border-success/15">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-[11px] font-medium text-success">Live</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Fleet overview and real-time activity</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger-children">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card glow-card group cursor-default">
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bgColor} ${stat.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <span className="text-3xl font-bold text-foreground tabular-nums">{stat.value}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="glass-card rounded-xl p-4 text-left group hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5"
          >
            <action.icon className={`h-5 w-5 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
            <p className="text-sm font-medium text-foreground">{action.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</p>
          </button>
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
                <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
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
                <div key={item.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors duration-150 group">
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
