interface DistributionPanelProps {
  items: { label: string; count: number }[];
  total: number;
  emptyLabel?: string;
}

export function DistributionPanel({ items, total, emptyLabel = "No data" }: DistributionPanelProps) {
  if (total === 0 || items.length === 0) {
    return <p className="text-xs text-muted-foreground py-3 text-center">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-2">
      {items.map((i) => {
        const pct = (i.count / max) * 100;
        return (
          <div key={i.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground truncate font-medium">{i.label}</span>
              <span className="text-muted-foreground tabular-nums">{i.count}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
