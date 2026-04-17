interface ActivityHeatmapProps {
  /** Counts indexed by hour 0..23 (relative to local time, last 24 hours rolling) */
  hourly: number[];
}

export function ActivityHeatmap({ hourly }: ActivityHeatmapProps) {
  const max = Math.max(...hourly, 1);
  const currentHour = new Date().getHours();

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-24 gap-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {hourly.map((count, hour) => {
          const intensity = count / max;
          const bg = count === 0
            ? "hsl(var(--muted))"
            : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`;
          const isCurrent = hour === currentHour;
          return (
            <div
              key={hour}
              title={`${hour.toString().padStart(2, "0")}:00 — ${count} task${count === 1 ? "" : "s"}`}
              className={`aspect-square rounded-sm transition-all hover:scale-110 hover:ring-1 hover:ring-primary ${
                isCurrent ? "ring-1 ring-primary/60" : ""
              }`}
              style={{ background: bg }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-0.5">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}
