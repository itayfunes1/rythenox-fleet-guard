import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

function NotificationItem({ n, onRead, onDelete }: { n: Notification; onRead: (id: string) => void; onDelete: (id: string) => void }) {
  const Icon = typeIcons[n.type] || Info;
  const color = typeColors[n.type] || "text-primary";

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors cursor-pointer group",
        n.read ? "opacity-60 hover:opacity-80" : "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={() => !n.read && onRead(n.id)}
    >
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", n.read ? "bg-muted/50" : "bg-primary/10")}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm truncate", n.read ? "font-normal" : "font-semibold")}>{n.title}</p>
          {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 self-center"
        onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function NotificationDropdown() {
  const { data: notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
                <Bell className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/60 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-1 space-y-0.5">
              {notifications.slice(0, 8).map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onRead={(id) => markAsRead.mutate(id)}
                  onDelete={(id) => deleteNotification.mutate(id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t border-border/50 p-2">
          <Button asChild variant="ghost" size="sm" className="w-full h-8 text-xs justify-center text-muted-foreground hover:text-foreground">
            <Link to="/notifications">
              View all notifications <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
