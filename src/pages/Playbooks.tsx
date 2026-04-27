import { useMemo, useState } from "react";
import { useDevices } from "@/hooks/use-devices";
import { useTenant } from "@/hooks/use-tenant";
import {
  useSavedCommands,
  useCreateSavedCommand,
  useDeleteSavedCommand,
} from "@/hooks/use-saved-commands";
import {
  usePlaybooks,
  useCreatePlaybook,
  useDeletePlaybook,
  useBulkExecute,
  type PlaybookStep,
} from "@/hooks/use-playbooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Plus, Trash2, Play, Zap, X } from "lucide-react";
import { toast } from "sonner";

export default function Playbooks() {
  const { data: tenant } = useTenant();
  const { data: devices = [] } = useDevices(tenant?.tenantId);
  const { data: savedCommands = [] } = useSavedCommands();
  const { data: playbooks = [] } = usePlaybooks();
  const createCmd = useCreateSavedCommand();
  const deleteCmd = useDeleteSavedCommand();
  const createPb = useCreatePlaybook();
  const deletePb = useDeletePlaybook();
  const bulkExec = useBulkExecute();

  const [cmdOpen, setCmdOpen] = useState(false);
  const [pbOpen, setPbOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);

  const [cmdName, setCmdName] = useState("");
  const [cmdDesc, setCmdDesc] = useState("");
  const [cmdText, setCmdText] = useState("");
  const [cmdCategory, setCmdCategory] = useState("general");

  const [pbName, setPbName] = useState("");
  const [pbDesc, setPbDesc] = useState("");
  const [pbSteps, setPbSteps] = useState<PlaybookStep[]>([{ command: "" }]);

  const [runCommands, setRunCommands] = useState<string[]>([]);
  const [runTargets, setRunTargets] = useState<string[]>([]);
  const [runProgress, setRunProgress] = useState<{ done: number; total: number } | null>(null);

  const onlineDevices = useMemo(() => devices.filter((d) => d.isResponsive), [devices]);

  const submitCmd = async () => {
    if (!cmdName.trim() || !cmdText.trim()) return;
    try {
      await createCmd.mutateAsync({
        name: cmdName.trim(),
        description: cmdDesc.trim() || undefined,
        command: cmdText.trim(),
        category: cmdCategory.trim() || "general",
      });
      toast.success("Saved command created");
      setCmdName("");
      setCmdDesc("");
      setCmdText("");
      setCmdCategory("general");
      setCmdOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save command");
    }
  };

  const submitPb = async () => {
    const steps = pbSteps.filter((s) => s.command.trim().length > 0);
    if (!pbName.trim() || steps.length === 0) {
      toast.error("Name and at least one step are required");
      return;
    }
    try {
      await createPb.mutateAsync({
        name: pbName.trim(),
        description: pbDesc.trim() || undefined,
        steps,
      });
      toast.success("Playbook created");
      setPbName("");
      setPbDesc("");
      setPbSteps([{ command: "" }]);
      setPbOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create playbook");
    }
  };

  const openRunForCommand = (command: string) => {
    setRunCommands([command]);
    setRunTargets([]);
    setRunProgress(null);
    setRunOpen(true);
  };

  const openRunForPlaybook = (steps: PlaybookStep[]) => {
    setRunCommands(steps.map((s) => s.command));
    setRunTargets([]);
    setRunProgress(null);
    setRunOpen(true);
  };

  const executeRun = async () => {
    if (runTargets.length === 0 || runCommands.length === 0) return;
    setRunProgress({ done: 0, total: runTargets.length * runCommands.length });
    try {
      const result = await bulkExec.mutateAsync({
        targetIds: runTargets,
        commands: runCommands,
        onProgress: (done, total) => setRunProgress({ done, total }),
      });
      if (result.failures.length > 0) {
        toast.warning(`Dispatched with ${result.failures.length} failure(s)`);
      } else {
        toast.success(`Dispatched ${result.total} command(s)`);
      }
      setTimeout(() => setRunOpen(false), 700);
    } catch (e: any) {
      toast.error(e.message ?? "Bulk execution failed");
      setRunProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Playbooks & Commands</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save reusable commands, build multi-step playbooks, and fan out across your fleet.
        </p>
      </div>

      <Tabs defaultValue="commands">
        <TabsList>
          <TabsTrigger value="commands">
            <Zap className="h-3.5 w-3.5 mr-1.5" /> Saved Commands
            <Badge variant="secondary" className="ml-2">{savedCommands.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="playbooks">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Playbooks
            <Badge variant="secondary" className="ml-2">{playbooks.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commands" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={cmdOpen} onOpenChange={setCmdOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Command</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save a command</DialogTitle>
                  <DialogDescription>Reusable across the fleet.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={cmdName} onChange={(e) => setCmdName(e.target.value)} placeholder="Health check" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={cmdCategory} onChange={(e) => setCmdCategory(e.target.value)} placeholder="general" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={cmdDesc} onChange={(e) => setCmdDesc(e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <Label>Command</Label>
                    <Textarea
                      value={cmdText}
                      onChange={(e) => setCmdText(e.target.value)}
                      rows={4}
                      placeholder="systeminfo"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCmdOpen(false)}>Cancel</Button>
                  <Button onClick={submitCmd} disabled={createCmd.isPending}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {savedCommands.length === 0 ? (
            <EmptyState icon={Zap} title="No saved commands" hint="Save your first command to reuse it across devices." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedCommands.map((c) => (
                <Card key={c.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-[10px]">{c.category}</Badge>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => deleteCmd.mutate(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    <pre className="text-[11px] font-mono bg-muted rounded p-2 overflow-x-auto">{c.command}</pre>
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => openRunForCommand(c.command)}>
                      <Play className="h-3.5 w-3.5 mr-1.5" /> Run on devices
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={pbOpen} onOpenChange={setPbOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Playbook</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a playbook</DialogTitle>
                  <DialogDescription>Run a sequence of commands as one workflow.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={pbName} onChange={(e) => setPbName(e.target.value)} placeholder="Daily health check" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={pbDesc} onChange={(e) => setPbDesc(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Steps</Label>
                    {pbSteps.map((step, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-xs text-muted-foreground mt-2.5 w-5">{i + 1}.</span>
                        <Textarea
                          value={step.command}
                          onChange={(e) => {
                            const next = [...pbSteps];
                            next[i] = { command: e.target.value };
                            setPbSteps(next);
                          }}
                          rows={2}
                          className="font-mono text-xs"
                          placeholder="command"
                        />
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 mt-1"
                          onClick={() => setPbSteps(pbSteps.length > 1 ? pbSteps.filter((_, idx) => idx !== i) : pbSteps)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setPbSteps([...pbSteps, { command: "" }])}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add step
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setPbOpen(false)}>Cancel</Button>
                  <Button onClick={submitPb} disabled={createPb.isPending}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {playbooks.length === 0 ? (
            <EmptyState icon={BookOpen} title="No playbooks yet" hint="Chain commands into reusable workflows." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {playbooks.map((p) => (
                <Card key={p.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{p.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-[10px]">{p.steps.length} step(s)</Badge>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => deletePb.mutate(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    <ol className="space-y-1">
                      {p.steps.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-[11px] font-mono text-muted-foreground truncate">
                          {i + 1}. {s.command}
                        </li>
                      ))}
                      {p.steps.length > 3 && (
                        <li className="text-[11px] text-muted-foreground">+ {p.steps.length - 3} more</li>
                      )}
                    </ol>
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => openRunForPlaybook(p.steps)}>
                      <Play className="h-3.5 w-3.5 mr-1.5" /> Run playbook
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk run dialog */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Run on devices</DialogTitle>
            <DialogDescription>
              {runCommands.length} command(s) × {runTargets.length} device(s) ={" "}
              <span className="font-semibold">{runCommands.length * runTargets.length}</span> task(s).
            </DialogDescription>
          </DialogHeader>

          {runProgress ? (
            <div className="space-y-2">
              <Progress value={(runProgress.done / runProgress.total) * 100} />
              <p className="text-xs text-muted-foreground text-center">
                Dispatched {runProgress.done} of {runProgress.total}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Targets</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => setRunTargets(onlineDevices.map((d) => d.target_id))}>
                    Select all online
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRunTargets([])}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
                {devices.map((d) => {
                  const checked = runTargets.includes(d.target_id);
                  return (
                    <label key={d.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) =>
                          setRunTargets(c ? [...runTargets, d.target_id] : runTargets.filter((t) => t !== d.target_id))
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{d.nickname ?? d.target_id}</div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">{d.target_id}</div>
                      </div>
                      <Badge variant={d.isResponsive ? "default" : "secondary"} className="text-[10px]">
                        {d.status}
                      </Badge>
                    </label>
                  );
                })}
                {devices.length === 0 && (
                  <p className="text-xs text-muted-foreground p-4 text-center">No devices in this organization.</p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRunOpen(false)}>Close</Button>
            <Button onClick={executeRun} disabled={runTargets.length === 0 || bulkExec.isPending || !!runProgress}>
              <Play className="h-3.5 w-3.5 mr-1.5" /> Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg">
      <Icon className="h-8 w-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
