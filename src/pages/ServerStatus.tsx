import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, CheckCircle, Clock, Info, Megaphone, Server, Trash2, Wrench, XCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";
import { useRelays } from "@/hooks/use-relays";
import { useAnnouncements, useCreateAnnouncement, useResolveAnnouncement, useDeleteAnnouncement, type Announcement } from "@/hooks/use-announcements";
import { useToast } from "@/hooks/use-toast";

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "Info" },
  maintenance: { icon: Wrench, color: "text-warning", bg: "bg-warning/10 border-warning/20", label: "Maintenance" },
  outage: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Outage" },
  resolved: { icon: CheckCircle, color: "text-success", bg: "bg-success/10 border-success/20", label: "Resolved" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function ServerHealthCard({ relays }: { relays: any[] | undefined }) {
  const online = relays?.filter((r) => {
    if (r.status !== "Online" || !r.last_seen) return false;
    return Date.now() - new Date(r.last_seen).getTime() < 90_000;
  }).length ?? 0;
  const total = relays?.length ?? 0;
  const healthPercent = total > 0 ? Math.round((online / total) * 100) : 0;

  const overallStatus = healthPercent === 100 ? "operational" : healthPercent >= 50 ? "degraded" : healthPercent > 0 ? "partial_outage" : total === 0 ? "unknown" : "major_outage";

  const statusMap = {
    operational: { label: "All Systems Operational", color: "text-success", bg: "bg-success/10 border-success/30", icon: CheckCircle, pulse: "bg-success" },
    degraded: { label: "Degraded Performance", color: "text-warning", bg: "bg-warning/10 border-warning/30", icon: AlertTriangle, pulse: "bg-warning" },
    partial_outage: { label: "Partial Outage", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: AlertTriangle, pulse: "bg-destructive" },
    major_outage: { label: "Major Outage", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: XCircle, pulse: "bg-destructive" },
    unknown: { label: "No Data Available", color: "text-muted-foreground", bg: "bg-muted/30 border-border", icon: Activity, pulse: "bg-muted-foreground" },
  };

  const s = statusMap[overallStatus];

  return (
    <Card className={`glass-card border ${s.bg}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`h-14 w-14 rounded-2xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-7 w-7 ${s.color}`} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.pulse} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${s.pulse}`} />
              </span>
            </div>
            <div>
              <h2 className={`text-xl font-bold ${s.color}`}>{s.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total > 0 ? `${online} of ${total} relay nodes online` : "Awaiting relay heartbeat data"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-foreground tabular-nums">{healthPercent}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uptime</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnnouncementCard({ a, isAdmin, onResolve, onDelete }: { a: Announcement; isAdmin: boolean; onResolve: (id: string) => void; onDelete: (id: string) => void }) {
  const cfg = a.status === "resolved" ? typeConfig.resolved : (typeConfig[a.type] ?? typeConfig.info);
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
              <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current/20`}>
                {a.status === "resolved" ? "Resolved" : cfg.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.message}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeAgo(a.created_at)}
              </span>
              {a.resolved_at && (
                <span className="text-[10px] text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Resolved {timeAgo(a.resolved_at)}
                </span>
              )}
            </div>
          </div>
        </div>
        {isAdmin && a.status === "active" && (
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onResolve(a.id)}>
              <CheckCircle className="h-3 w-3 mr-1" /> Resolve
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => onDelete(a.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        {isAdmin && a.status === "resolved" && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => onDelete(a.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ServerStatus() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: relays } = useRelays(tenant?.tenantId);
  const { data: announcements, isLoading } = useAnnouncements(tenant?.tenantId);
  const createMut = useCreateAnnouncement();
  const resolveMut = useResolveAnnouncement();
  const deleteMut = useDeleteAnnouncement();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");

  const isAdmin = true; // RLS enforces actual permission; UI shows the form to everyone but insert will fail for non-admins

  const activeAnnouncements = announcements?.filter((a) => a.status === "active") ?? [];
  const resolvedAnnouncements = announcements?.filter((a) => a.status === "resolved") ?? [];

  const handleCreate = async () => {
    if (!title.trim() || !message.trim() || !tenant?.tenantId || !user?.id) return;
    try {
      await createMut.mutateAsync({ tenant_id: tenant.tenantId, user_id: user.id, title: title.trim(), message: message.trim(), type });
      setTitle("");
      setMessage("");
      setType("info");
      toast({ title: "Announcement posted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create announcement", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Server Status</h1>
        <p className="text-sm text-muted-foreground">System health, announcements & maintenance updates</p>
      </div>

      {/* Health Overview */}
      <ServerHealthCard relays={relays} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Relay Nodes", value: relays?.length ?? 0, icon: Server, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
          { label: "Active Incidents", value: activeAnnouncements.filter((a) => a.type === "outage").length, icon: XCircle, gradient: "from-destructive/20 to-destructive/5", iconColor: "text-destructive" },
          { label: "Maintenance", value: activeAnnouncements.filter((a) => a.type === "maintenance").length, icon: Wrench, gradient: "from-warning/20 to-warning/5", iconColor: "text-warning" },
          { label: "Resolved", value: resolvedAnnouncements.length, icon: CheckCircle, gradient: "from-success/20 to-success/5", iconColor: "text-success" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card group cursor-default">
            <CardContent className="p-4 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <div className={`h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center ${stat.iconColor}`}>
                    <stat.icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-foreground tabular-nums">{stat.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Announcement (admin) */}
      {isAdmin && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Post Announcement</CardTitle>
            </div>
            <CardDescription className="text-xs">Notify users about outages, maintenance, or updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
              <Input
                placeholder="Announcement title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-sm bg-muted/50 border-border/50"
              />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 text-sm bg-muted/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                  <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                  <SelectItem value="outage">🔴 Outage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Describe the issue, expected resolution time, affected services..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[80px] text-sm bg-muted/50 border-border/50 resize-none"
            />
            <Button
              size="sm"
              disabled={!title.trim() || !message.trim() || createMut.isPending}
              onClick={handleCreate}
              className="text-xs"
            >
              <Megaphone className="h-3 w-3 mr-1.5" />
              {createMut.isPending ? "Posting..." : "Post Announcement"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Announcements */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle className="text-base font-semibold">Active Announcements</CardTitle>
            <Badge variant="outline" className="text-[10px] ml-auto">{activeAnnouncements.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/30 shimmer" />)}
            </div>
          ) : activeAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No active incidents</p>
              <p className="text-xs text-muted-foreground/60 mt-1">All systems are running normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAnnouncements.map((a) => (
                <AnnouncementCard key={a.id} a={a} isAdmin={isAdmin} onResolve={(id) => resolveMut.mutate(id)} onDelete={(id) => deleteMut.mutate(id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved History */}
      {resolvedAnnouncements.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Past Incidents</CardTitle>
              <Badge variant="outline" className="text-[10px] ml-auto">{resolvedAnnouncements.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolvedAnnouncements.map((a) => (
                <AnnouncementCard key={a.id} a={a} isAdmin={isAdmin} onResolve={(id) => resolveMut.mutate(id)} onDelete={(id) => deleteMut.mutate(id)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
