import { AlertTriangle, CheckCircle2, Info, TrendingUp, Zap } from "lucide-react";

export interface Insight {
  id: string;
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  detail?: string;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TrendingUp,
  critical: AlertTriangle,
};

const COLORS = {
  info: { icon: "text-primary", bg: "bg-primary/8", border: "border-primary/15" },
  success: { icon: "text-success", bg: "bg-success/8", border: "border-success/15" },
  warning: { icon: "text-warning", bg: "bg-warning/8", border: "border-warning/15" },
  critical: { icon: "text-destructive", bg: "bg-destructive/8", border: "border-destructive/15" },
};

export function SmartInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Zap className="h-6 w-6 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">No insights yet — collecting data</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((i) => {
        const Icon = ICONS[i.severity];
        const c = COLORS[i.severity];
        return (
          <div
            key={i.id}
            className={`flex items-start gap-2.5 p-2.5 rounded-md border ${c.border} ${c.bg}`}
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${c.icon}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{i.title}</p>
              {i.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{i.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
