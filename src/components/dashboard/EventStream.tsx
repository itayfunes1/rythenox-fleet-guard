import { Activity, CheckCircle2, AlertTriangle, Wifi, WifiOff, Terminal, Clock, TrendingUp } from "lucide-react";

export interface StreamEvent {
  id: string;
  type: "task-completed" | "task-failed" | "task-pending" | "task-sent" | "device-online" | "device-offline" | "session-open";
  title: string;
  subtitle: string;
  timestamp: string;
}

const META = {
  "task-completed": { icon: CheckCircle2, color: "text-success" },
  "task-failed": { icon: AlertTriangle, color: "text-destructive" },
  "task-pending": { icon: Clock, color: "text-warning" },
  "task-sent": { icon: TrendingUp, color: "text-primary" },
  "device-online": { icon: Wifi, color: "text-success" },
  "device-offline": { icon: WifiOff, color: "text-destructive" },
  "session-open": { icon: Terminal, color: "text-primary" },
};

export function EventStream({ events }: { events: StreamEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-6 w-6 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">No recent events</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
      {events.map((e) => {
        const m = META[e.type];
        const Icon = m.icon;
        return (
          <div key={e.id} className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors">
            <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${m.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{e.title}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{e.subtitle}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap tabular-nums shrink-0">
              {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
