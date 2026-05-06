import { useEffect, useMemo, useState } from "react";
import { Zap, Loader2, CheckCircle2, XCircle, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSavedCommands } from "@/hooks/use-saved-commands";
import type { ManagedDevice } from "@/hooks/use-devices";

interface Props {
  tenantId: string | undefined;
  devices: ManagedDevice[];
  filterActive: boolean;
}

type RunState = "idle" | "running" | "done";
interface RowResult {
  targetId: string;
  status: "pending" | "ok" | "error";
  error?: string;
}

export function BulkCommandRunner({ tenantId, devices, filterActive }: Props) {
  const { user } = useAuth();
  const { data: savedCommands = [] } = useSavedCommands();

  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyOnline, setOnlyOnline] = useState(true);
  const [runState, setRunState] = useState<RunState>("idle");
  const [results, setResults] = useState<RowResult[]>([]);
  const [confirming, setConfirming] = useState(false);

  // Pre-select all devices when opening
  useEffect(() => {
    if (open) {
      setSelected(new Set(devices.map((d) => d.target_id)));
      setRunState("idle");
      setResults([]);
      setConfirming(false);
    }
  }, [open, devices]);

  const targets = useMemo(
    () => devices.filter((d) => selected.has(d.target_id) && (!onlyOnline || d.status === "Online")),
    [devices, selected, onlyOnline],
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === devices.length) setSelected(new Set());
    else setSelected(new Set(devices.map((d) => d.target_id)));
  };

  const run = async () => {
    if (!tenantId || !user) return;
    if (!command.trim()) {
      toast.error("Command is required");
      return;
    }
    if (targets.length === 0) {
      toast.error("No targets selected");
      return;
    }
    setRunState("running");
    const initial: RowResult[] = targets.map((t) => ({ targetId: t.target_id, status: "pending" }));
    setResults(initial);

    // Insert in batches of 25 for safety, but parallel per batch
    const batchSize = 25;
    const updated: RowResult[] = [...initial];

    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      const rows = batch.map((t) => ({
        tenant_id: tenantId,
        target_id: t.target_id,
        command: command.trim(),
      }));
      const { error } = await supabase.from("remote_tasks").insert(rows);
      batch.forEach((t) => {
        const idx = updated.findIndex((r) => r.targetId === t.target_id);
        if (idx >= 0) {
          updated[idx] = error
            ? { targetId: t.target_id, status: "error", error: "Insert failed" }
            : { targetId: t.target_id, status: "ok" };
        }
      });
      setResults([...updated]);
    }

    setRunState("done");
    const okCount = updated.filter((r) => r.status === "ok").length;
    toast.success(`Dispatched to ${okCount} of ${targets.length} device${targets.length === 1 ? "" : "s"}`);
  };

  const reset = () => {
    setRunState("idle");
    setResults([]);
    setConfirming(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-1.5" disabled={devices.length === 0}>
          <Zap className="h-3.5 w-3.5" />
          Bulk run
          {filterActive && devices.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">{devices.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Bulk Command Runner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Saved command picker */}
          {savedCommands.length > 0 && runState === "idle" && (
            <Select onValueChange={(id) => {
              const c = savedCommands.find((s) => s.id === id);
              if (c) setCommand(c.command);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Insert from saved commands…" />
              </SelectTrigger>
              <SelectContent>
                {savedCommands.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground font-mono ml-2 text-xs">{c.command.slice(0, 40)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Textarea
            placeholder="Command to run on each device (e.g. systeminfo, whoami, ipconfig /all)"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            rows={3}
            className="font-mono text-sm"
            disabled={runState === "running"}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Checkbox
                id="only-online"
                checked={onlyOnline}
                onCheckedChange={(v) => setOnlyOnline(!!v)}
                disabled={runState === "running"}
              />
              <label htmlFor="only-online" className="cursor-pointer">Only online devices</label>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
              disabled={runState === "running"}
            >
              {selected.size === devices.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <ScrollArea className="h-56 rounded-md border border-border/50">
            <div className="p-2 space-y-0.5">
              {devices.map((d) => {
                const result = results.find((r) => r.targetId === d.target_id);
                const isSelected = selected.has(d.target_id);
                const skipped = onlyOnline && d.status !== "Online" && isSelected;
                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                      skipped ? "opacity-40" : ""
                    } ${result?.status === "error" ? "bg-destructive/5" : ""}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(d.target_id)}
                      disabled={runState !== "idle"}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs truncate">
                        {d.nickname || d.target_id}
                      </div>
                      {d.nickname && (
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{d.target_id}</div>
                      )}
                    </div>
                    <Badge
                      variant={d.status === "Online" ? "default" : "outline"}
                      className="text-[10px] h-4 px-1"
                    >
                      {d.status}
                    </Badge>
                    {result?.status === "pending" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {result?.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                    {result?.status === "error" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {targets.length} target{targets.length === 1 ? "" : "s"}
              {onlyOnline && selected.size !== targets.length && ` · ${selected.size - targets.length} offline skipped`}
            </span>
            {runState === "done" && (
              <span>
                {results.filter((r) => r.status === "ok").length} ok ·{" "}
                {results.filter((r) => r.status === "error").length} failed
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {runState === "done" ? (
            <>
              <Button variant="outline" onClick={reset}>Run another</Button>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </>
          ) : confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={runState === "running"}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={run} disabled={runState === "running"}>
                {runState === "running" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dispatching…</>
                ) : (
                  <>Confirm — run on {targets.length}</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={() => setConfirming(true)}
                disabled={!command.trim() || targets.length === 0}
                className="gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                Run on {targets.length}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
