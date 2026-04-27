import { useMemo, useState } from "react";
import { useAuditLog } from "@/hooks/use-audit-log";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, User, Activity } from "lucide-react";

const ENTITY_TYPES = ["all", "remote_task", "build", "announcement"];

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<string>("all");

  const { data: entries = [], isLoading } = useAuditLog({
    entityType: entityType === "all" ? undefined : entityType,
    search: search || undefined,
  });

  const actionCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.action] = (counts[e.action] ?? 0) + 1;
    return counts;
  }, [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Immutable record of every meaningful action in your organization.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, or entity…"
            className="pl-9"
          />
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t === "all" ? "All entity types" : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{entries.length} event(s)</Badge>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ScrollText className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No audit events</p>
            <p className="text-xs text-muted-foreground mt-1">Activity will appear here as your team works.</p>
          </div>
        ) : (
          <div className="divide-y">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-3 hover:bg-muted/30">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono font-semibold text-foreground">{e.action}</code>
                    <Badge variant="outline" className="text-[10px]">{e.entity_type}</Badge>
                    {e.entity_id && (
                      <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[240px]">
                        {e.entity_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{e.actor_email ?? "system"}</span>
                    <span>·</span>
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  {Object.keys(e.metadata).length > 0 && (
                    <pre className="text-[10px] font-mono text-muted-foreground bg-muted/50 rounded p-2 mt-2 overflow-x-auto">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {Object.keys(actionCount).length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">By action</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(actionCount)
              .sort((a, b) => b[1] - a[1])
              .map(([action, count]) => (
                <Badge key={action} variant="outline" className="font-mono text-[10px]">
                  {action} <span className="ml-1.5 text-muted-foreground">{count}</span>
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
