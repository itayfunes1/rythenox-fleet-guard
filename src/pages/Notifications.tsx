import { useMemo, useState } from "react";
import { Bell, Check, CheckCheck, Trash2, Search, Info, AlertTriangle, CheckCircle, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const typeColors: Record<string, string> = {
  info: "text-primary",
  warning: "text-warning",
  success: "text-success",
  error: "text-destructive",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function NotificationsPage() {
  const { data: notifications = [], unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (readFilter === "unread" && n.read) return false;
      if (readFilter === "read" && !n.read) return false;
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [notifications, readFilter, typeFilter, search]);

  const allSelected = filtered.length > 0 && filtered.every((n) => selected.has(n.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const bulkRead = async () => {
    for (const id of selected) {
      const n = notifications.find((x) => x.id === id);
      if (n && !n.read) markAsRead.mutate(id);
    }
    setSelected(new Set());
  };

  const bulkDelete = async () => {
    for (const id of selected) deleteNotification.mutate(id);
    setSelected(new Set());
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"} · {notifications.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
            </Button>
          )}
        </div>
      </header>

      <Card className="border-border/60">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={readFilter} onValueChange={(v) => setReadFilter(v as typeof readFilter)}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  Unread {unreadCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{unreadCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="read" className="text-xs">Read</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} id="select-all" />
                <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                  {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                </label>
              </div>
              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={bulkRead}>
                    <Check className="h-3 w-3 mr-1" /> Mark read
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={bulkDelete}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-340px)] min-h-[320px]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No notifications match</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filtered.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    selected={selected.has(n.id)}
                    onSelect={() => toggleOne(n.id)}
                    onRead={() => !n.read && markAsRead.mutate(n.id)}
                    onDelete={() => deleteNotification.mutate(n.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationRow({
  n, selected, onSelect, onRead, onDelete,
}: {
  n: Notification;
  selected: boolean;
  onSelect: () => void;
  onRead: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcons[n.type] || Info;
  const color = typeColors[n.type] || "text-primary";

  return (
    <div className={cn("flex gap-3 px-4 py-3 transition-colors group", n.read ? "bg-transparent" : "bg-primary/5")}>
      <div className="pt-0.5">
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </div>
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", n.read ? "bg-muted/50" : "bg-primary/10")}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onRead}>
        <div className="flex items-center gap-2">
          <p className={cn("text-sm truncate", n.read ? "font-normal" : "font-semibold")}>{n.title}</p>
          {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
          <Badge variant="outline" className="ml-auto text-[10px] capitalize shrink-0">{n.type}</Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 self-start"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
