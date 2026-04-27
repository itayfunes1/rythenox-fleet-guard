import { useMemo, useState } from "react";
import {
  useScheduledTasks,
  useCreateScheduledTask,
  useUpdateScheduledTask,
  useDeleteScheduledTask,
} from "@/hooks/use-scheduled-tasks";
import { useDevices } from "@/hooks/use-devices";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily 09:00", value: "0 9 * * *" },
  { label: "Weekly Mon 09:00", value: "0 9 * * 1" },
];

export default function Schedules() {
  const { data: tenant } = useTenant();
  const { data: devices = [] } = useDevices(tenant?.tenantId);
  const { data: schedules = [] } = useScheduledTasks();
  const createSched = useCreateScheduledTask();
  const updateSched = useUpdateScheduledTask();
  const deleteSched = useDeleteScheduledTask();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [cron, setCron] = useState("0 9 * * *");
  const [targets, setTargets] = useState<string[]>([]);

  const onlineDevices = useMemo(() => devices.filter((d) => d.isResponsive), [devices]);

  const submit = async () => {
    if (!name.trim() || !command.trim() || !cron.trim() || targets.length === 0) {
      toast.error("Name, command, schedule and at least one target are required");
      return;
    }
    try {
      await createSched.mutateAsync({
        name: name.trim(),
        command: command.trim(),
        cron_expression: cron.trim(),
        target_ids: targets,
      });
      toast.success("Schedule created");
      setName(""); setCommand(""); setCron("0 9 * * *"); setTargets([]);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create schedule");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scheduled Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recurring commands that fire on a cron schedule.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Schedule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create a scheduled task</DialogTitle>
              <DialogDescription>Will run on the chosen devices on the chosen cadence.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly health check" />
              </div>
              <div>
                <Label>Command</Label>
                <Textarea value={command} onChange={(e) => setCommand(e.target.value)} rows={2} className="font-mono text-xs" />
              </div>
              <div>
                <Label>Cron expression</Label>
                <Input value={cron} onChange={(e) => setCron(e.target.value)} className="font-mono text-xs" />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESETS.map((p) => (
                    <Button key={p.value} variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setCron(p.value)}>
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Targets</Label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => setTargets(onlineDevices.map((d) => d.target_id))}>All online</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTargets([])}>Clear</Button>
                  </div>
                </div>
                <div className="max-h-44 overflow-y-auto border rounded-md divide-y mt-1">
                  {devices.map((d) => {
                    const checked = targets.includes(d.target_id);
                    return (
                      <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => setTargets(c ? [...targets, d.target_id] : targets.filter((t) => t !== d.target_id))}
                        />
                        <span className="text-xs flex-1 truncate">{d.nickname ?? d.target_id}</span>
                        <Badge variant={d.isResponsive ? "default" : "secondary"} className="text-[10px]">{d.status}</Badge>
                      </label>
                    );
                  })}
                  {devices.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">No devices.</p>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createSched.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg">
          <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No scheduled tasks</p>
          <p className="text-xs text-muted-foreground mt-1">Create one to automate recurring commands.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {schedules.map((s) => (
            <Card key={s.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm truncate">{s.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(checked) => updateSched.mutate({ id: s.id, enabled: checked })}
                    />
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => deleteSched.mutate(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <pre className="text-[11px] font-mono bg-muted rounded p-2 overflow-x-auto">{s.command}</pre>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="font-mono">{s.cron_expression}</Badge>
                  <Badge variant="outline">{s.target_ids.length} target(s)</Badge>
                  {s.last_run_at && <span>Last: {new Date(s.last_run_at).toLocaleString()}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
