import { useEffect, useMemo, useState } from "react";
import { Rocket, AlertTriangle, Wrench, Info, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnnouncements, type Announcement } from "@/hooks/use-announcements";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "rythenox.dismissed-announcements";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
}
function addDismissed(id: string) {
  const set = new Set(getDismissed());
  set.add(id);
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
}

const TYPE_META: Record<string, { icon: typeof Rocket; label: string; tone: string }> = {
  agent_update: { icon: Rocket, label: "Agent update", tone: "bg-primary/8 border-primary/30 text-primary" },
  incident:     { icon: AlertTriangle, label: "Incident", tone: "bg-destructive/8 border-destructive/30 text-destructive" },
  maintenance:  { icon: Wrench, label: "Maintenance", tone: "bg-warning/10 border-warning/30 text-warning-foreground" },
  info:         { icon: Info, label: "Notice", tone: "bg-muted border-border text-foreground" },
};

export function AnnouncementBanner() {
  const { data } = useAnnouncements();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => { setDismissed(getDismissed()); }, []);

  const active: Announcement | undefined = useMemo(() => {
    const list = (data || []).filter((a) => a.status === "active" && !dismissed.includes(a.id));
    // Prioritize agent_update, then most recent
    return list.sort((a, b) => {
      if (a.type === "agent_update" && b.type !== "agent_update") return -1;
      if (b.type === "agent_update" && a.type !== "agent_update") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0];
  }, [data, dismissed]);

  if (!active) return null;
  const meta = TYPE_META[active.type] || TYPE_META.info;
  const Icon = meta.icon;

  const handleDismiss = () => {
    addDismissed(active.id);
    setDismissed(getDismissed());
  };

  return (
    <div className={cn("rounded-xl border px-4 py-3 mb-5 flex items-start gap-3", meta.tone)}>
      <div className="h-8 w-8 rounded-lg bg-background/60 border border-border/60 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-current bg-background/40">
            {meta.label}
          </Badge>
          {active.version && (
            <Badge variant="outline" className="text-[10px] font-mono bg-background/40 border-current">
              {active.version}
            </Badge>
          )}
          <p className="text-sm font-semibold text-foreground truncate">{active.title}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{active.message}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={handleDismiss}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
