import { useEffect, useState } from "react";
import { Activity, Terminal, Radio, Clock } from "lucide-react";

interface LivePulseStripProps {
  commandsLastHour: number;
  activeSessions: number;
  onlineRelays: number;
  totalRelays: number;
  lastHeartbeat: string | null;
}

function formatRelative(iso: string | null, nowMs: number): string {
  if (!iso) return "no signal";
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function LivePulseStrip({
  commandsLastHour,
  activeSessions,
  onlineRelays,
  totalRelays,
  lastHeartbeat,
}: LivePulseStripProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-md border border-border bg-card overflow-x-auto">
      <div className="flex items-center gap-2 px-3 py-0.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Live</span>
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      <PulseItem icon={Activity} label="Commands / hr" value={commandsLastHour.toString()} accent="text-primary" />
      <PulseItem icon={Terminal} label="Active sessions" value={activeSessions.toString()} accent="text-success" />
      <PulseItem
        icon={Radio}
        label="Relays online"
        value={`${onlineRelays}/${totalRelays}`}
        accent={onlineRelays === totalRelays && totalRelays > 0 ? "text-success" : "text-warning"}
      />
      <PulseItem icon={Clock} label="Last heartbeat" value={formatRelative(lastHeartbeat, now)} accent="text-muted-foreground" mono />
    </div>
  );
}

function PulseItem({
  icon: Icon,
  label,
  value,
  accent,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-0.5 shrink-0">
      <Icon className={`h-3.5 w-3.5 ${accent}`} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-semibold tabular-nums ${mono ? "font-mono" : ""} text-foreground`}>{value}</span>
    </div>
  );
}
