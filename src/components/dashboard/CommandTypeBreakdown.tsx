interface CommandTypeBreakdownProps {
  buckets: { name: string; count: number }[];
}

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

export function CommandTypeBreakdown({ buckets }: CommandTypeBreakdownProps) {
  const total = buckets.reduce((s, b) => s + b.count, 0);

  if (total === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground">No commands executed yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {buckets.map((b, i) => (
          <div
            key={b.name}
            style={{ width: `${(b.count / total) * 100}%`, background: PALETTE[i % PALETTE.length] }}
            title={`${b.name}: ${b.count}`}
          />
        ))}
      </div>
      <div className="space-y-1.5 pt-1">
        {buckets.map((b, i) => (
          <div key={b.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="font-mono text-foreground truncate">{b.name}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums shrink-0">
              <span className="text-muted-foreground">{b.count}</span>
              <span className="text-[10px] text-muted-foreground/60 w-9 text-right">
                {((b.count / total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
