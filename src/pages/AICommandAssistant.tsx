import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Send, Play, ShieldAlert, Wand2, Terminal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices } from "@/hooks/use-devices";
import { useCreateTask } from "@/hooks/use-tasks";

interface Suggestion {
  command: string;
  target_ids: string[];
  rationale: string;
  risk: "low" | "medium" | "high";
  os_target: string;
  fleet?: { total: number; online: number };
}

const EXAMPLES = [
  "Show disk usage on all Linux boxes",
  "Restart the Windows print spooler service",
  "List the top 5 memory-hungry processes",
  "Check uptime everywhere",
];

export default function AICommandAssistant() {
  const { data: tenant } = useTenant();
  const { data: devices = [] } = useDevices(tenant?.tenantId);
  const createTask = useCreateTask();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [editedCmd, setEditedCmd] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ask = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-command-assistant", {
        body: { prompt: prompt.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const s = data as Suggestion;
      setSuggestion(s);
      setEditedCmd(s.command);
      setSelected(new Set(s.target_ids));
      if (!s.command) toast.warning("AI couldn't suggest a safe command — try rephrasing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get suggestion");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (tid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(tid) ? next.delete(tid) : next.add(tid);
      return next;
    });

  const run = async () => {
    if (!tenant?.tenantId || !editedCmd.trim() || selected.size === 0) return;
    if (suggestion?.risk === "high") {
      const ok = window.confirm(
        "This command is flagged HIGH RISK and may be destructive. Are you absolutely sure you want to run it?",
      );
      if (!ok) return;
    }
    let dispatched = 0;
    for (const target of selected) {
      try {
        await createTask.mutateAsync({
          tenant_id: tenant.tenantId,
          target_id: target,
          command: editedCmd.trim(),
        });
        dispatched++;
      } catch (e) {
        console.error("dispatch failed", target, e);
      }
    }
    toast.success(`Dispatched to ${dispatched} device${dispatched === 1 ? "" : "s"}`);
  };

  const riskColor =
    suggestion?.risk === "high"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : suggestion?.risk === "medium"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Command Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe what you want to do. The assistant generates a safe shell command and picks the right devices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Ask in plain English
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Show me disk usage on all the Linux servers"
            rows={3}
            maxLength={1000}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") ask();
            }}
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter to submit</span>
            <Button onClick={ask} disabled={loading || !prompt.trim()} size="sm">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {loading ? "Thinking…" : "Suggest command"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {suggestion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Suggested command
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={riskColor}>
                  {suggestion.risk === "high" && <ShieldAlert className="h-3 w-3 mr-1" />}
                  {suggestion.risk.toUpperCase()} RISK
                </Badge>
                <Badge variant="outline">{suggestion.os_target}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestion.rationale && (
              <p className="text-sm text-muted-foreground">{suggestion.rationale}</p>
            )}

            <Textarea
              value={editedCmd}
              onChange={(e) => setEditedCmd(e.target.value)}
              rows={3}
              className="font-mono text-xs"
              placeholder="Edit the command before running…"
            />

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Targets ({selected.size}/{devices.length})
              </div>
              {devices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrolled devices.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-72 overflow-auto pr-1">
                  {devices.map((d) => {
                    const recommended = suggestion.target_ids.includes(d.target_id);
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer hover:bg-muted/50 ${
                          recommended ? "border-primary/40 bg-primary/5" : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={selected.has(d.target_id)}
                          onCheckedChange={() => toggle(d.target_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-[13px]">
                            {d.nickname ?? d.target_id}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            {d.os_info ?? "unknown"} · {d.status}
                          </div>
                        </div>
                        {recommended && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4">
                            AI pick
                          </Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setSuggestion(null)}>
                Dismiss
              </Button>
              <Button
                onClick={run}
                disabled={!editedCmd.trim() || selected.size === 0 || createTask.isPending}
                size="sm"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Run on {selected.size} device{selected.size === 1 ? "" : "s"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
