import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Monitor, Wifi, WifiOff, Activity, Rocket, FolderArchive, Network,
  TrendingUp, Clock, AlertTriangle, CheckCircle2, ChevronRight,
  BarChart3, Shield, Server,
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices } from "@/hooks/use-devices";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading: devicesLoading } = useDevices(tenant?.tenantId);
  const { data: liveTasks, isLoading: tasksLoading } = useTasks(tenant?.tenantId);
  const navigate = useNavigate();

  const onlineCount = liveDevices?.filter((d) => d.status === "Online").length ?? 0;
  const offlineCount = liveDevices?.filter((d) => d.status === "Offline").length ?? 0;
  const totalDevices = liveDevices?.length ?? 0;
  const healthPercent = totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 100) : 0;

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const pendingTasks = (liveTasks || []).filter((t) => t.status === "Pending" || t.status === "Sent").length;
  const completedTasks = (liveTasks || []).filter((t) => t.status === "Completed").length;
  const failedTasks = (liveTasks || []).filter((t) => t.status === "Failed").length;

  const recentDevices = (liveDevices || []).slice(0, 5);
  const recentTasks = (liveTasks || []).slice(0, 8);

  const isLoading = devicesLoading || tasksLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "text-success";
      case "Failed": return "text-destructive";
      case "Pending": return "text-warning";
      case "Sent": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case "Failed": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case "Pending": return <Clock className="h-3.5 w-3.5 text-warning" />;
      case "Sent": return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
      default: return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

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

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Devices</span>
              <div className="h-8 w-8 rounded-md bg-primary/8 flex items-center justify-center">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{totalDevices}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Registered endpoints</p>
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
              <span className="text-[11px] text-success font-medium">{healthPercent}% uptime</span>
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
            <p className="text-[11px] text-muted-foreground mt-1">Require attention</p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasks</span>
              <div className="h-8 w-8 rounded-md bg-warning/8 flex items-center justify-center">
                <Activity className="h-4 w-4 text-warning" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{pendingTasks}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Pending execution</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Fleet Health + Devices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fleet Health */}
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
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <div className="text-lg font-bold text-foreground tabular-nums">{completedTasks}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <div className="text-lg font-bold text-foreground tabular-nums">{pendingTasks}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <div className="text-lg font-bold text-foreground tabular-nums">{failedTasks}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Inventory Table */}
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
        </div>

        {/* Right Column - Quick Actions + Activity Feed */}
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
              <button
                onClick={() => navigate("/devices")}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="h-9 w-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                  <Monitor className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Device Management</p>
                  <p className="text-[11px] text-muted-foreground">Terminal & remote access</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => navigate("/deployment")}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="h-9 w-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                  <Rocket className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Deploy Agent</p>
                  <p className="text-[11px] text-muted-foreground">Build & download binaries</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => navigate("/diagnostics")}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="h-9 w-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                  <FolderArchive className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Diagnostic Vault</p>
                  <p className="text-[11px] text-muted-foreground">Files & telemetry data</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => navigate("/network")}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="h-9 w-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                  <Network className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Network Infra</p>
                  <p className="text-[11px] text-muted-foreground">Relay nodes & health</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </button>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Task Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />)}
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-6 w-6 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No recent tasks</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="mt-0.5 shrink-0">{getStatusIcon(task.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{task.command}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{task.target_id}</span>
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                          <span className={`text-[10px] font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap tabular-nums shrink-0">
                        {new Date(task.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
