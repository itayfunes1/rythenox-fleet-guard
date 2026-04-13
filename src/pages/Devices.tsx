import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Terminal, RefreshCw, X, Loader2, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices, type ManagedDevice } from "@/hooks/use-devices";
import { useCreateTask, useDeviceTasks } from "@/hooks/use-tasks";
import { useStartSession, useEndSession } from "@/hooks/use-active-sessions";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLastSeenAge } from "@/lib/device-presence";

export default function Devices() {
  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<ManagedDevice | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cmdInput, setCmdInput] = useState("");
  const { toast } = useToast();
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading, refetch, isFetching } = useDevices(tenant?.tenantId);
  const createTask = useCreateTask();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const { data: deviceTasks } = useDeviceTasks(tenant?.tenantId, selectedDevice?.target_id);

  const filtered = (liveDevices || []).filter(
    (d) =>
      d.target_id.toLowerCase().includes(search.toLowerCase()) ||
      (d.os_info || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.public_ip || "").toLowerCase().includes(search.toLowerCase())
  );

  const currentSelectedDevice = selectedDevice
    ? (liveDevices || []).find((device) => device.target_id === selectedDevice.target_id) ?? selectedDevice
    : null;

  const selectedDeviceIsResponsive = currentSelectedDevice
    ? currentSelectedDevice.isResponsive ?? currentSelectedDevice.status === "Online"
    : false;

  const selectedDeviceLastSeenLabel = currentSelectedDevice?.last_seen
    ? formatLastSeenAge(currentSelectedDevice.last_seen)
    : "an unknown time";

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [deviceTasks]);

  useEffect(() => {
    if (selectedDevice) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedDevice]);

  const handleOpenTerminal = (device: ManagedDevice) => {
    setSelectedDevice(device);
    setCmdInput("");

    if (tenant?.tenantId && user?.id) {
      startSession.mutate(
        { tenant_id: tenant.tenantId, user_id: user.id, target_id: device.target_id },
        { onSuccess: (data) => setActiveSessionId(data.id) }
      );
    }
  };

  const handleCloseTerminal = useCallback(() => {
    if (activeSessionId) {
      endSession.mutate(activeSessionId);
      setActiveSessionId(null);
    }
    setSelectedDevice(null);
  }, [activeSessionId, endSession]);

  useEffect(() => {
    return () => {
      if (activeSessionId) {
        supabase.from("active_sessions").delete().eq("id", activeSessionId).then();
      }
    };
  }, [activeSessionId]);

  const handleSendCommand = () => {
    if (!tenant?.tenantId || !currentSelectedDevice || !cmdInput.trim()) return;

    if (!selectedDeviceIsResponsive) {
      toast({
        title: "Device offline",
        description: `No heartbeat received from ${currentSelectedDevice.target_id} for ${selectedDeviceLastSeenLabel}. Commands will stay queued until the agent reconnects.`,
        variant: "destructive",
      });
      return;
    }

    createTask.mutate(
      { tenant_id: tenant.tenantId, target_id: currentSelectedDevice.target_id, command: cmdInput.trim() },
      {
        onSuccess: () => setCmdInput(""),
        onError: (err) => {
          toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        },
      }
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "text-warning";
      case "Sent": return "text-primary";
      case "Completed": return "text-success";
      case "Failed": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  // Terminal view
  if (currentSelectedDevice) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 glass-card rounded-none">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 border border-success/20">
              <Terminal className="h-4 w-4 text-success" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-foreground">{currentSelectedDevice.target_id}</h2>
              <p className="text-xs text-muted-foreground">
                {currentSelectedDevice.public_ip || "Unknown IP"} · {currentSelectedDevice.os_info || "Unknown OS"} · {currentSelectedDevice.arch || "Unknown Arch"}
              </p>
            </div>
            <StatusBadge status={selectedDeviceIsResponsive ? "online" : "offline"} />
          </div>
          <Button variant="ghost" size="icon" onClick={handleCloseTerminal} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Terminal body */}
        <ScrollArea className="flex-1 terminal-bg">
          <div className="p-4 font-mono text-sm space-y-3 min-h-full">
            <div className="text-success text-xs">
              ── Connected to {currentSelectedDevice.target_id} ──
            </div>
            <div className="text-[hsl(var(--terminal-foreground))] text-xs opacity-60">
              Commands are queued and picked up by the agent on next poll cycle.
            </div>

            {!selectedDeviceIsResponsive && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                No heartbeat has been received from this agent since {selectedDeviceLastSeenLabel}. New commands are blocked until it reconnects and polls again.
              </div>
            )}

            {(deviceTasks || []).map((task) => (
              <div key={task.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-success">$</span>
                  <span className="text-[hsl(var(--terminal-foreground))]">{task.command}</span>
                  <span className={`text-xs ml-auto ${getStatusColor(task.status)}`}>
                    [{task.status}]
                  </span>
                </div>
                {task.status === "Pending" || task.status === "Sent" ? (
                  <div className="flex items-center gap-2 pl-4 text-[hsl(var(--terminal-foreground))] opacity-60 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {task.status === "Pending"
                      ? selectedDeviceIsResponsive
                        ? "Waiting for agent to pick up..."
                        : `No recent heartbeat from the agent (${selectedDeviceLastSeenLabel}); this task will remain queued until it reconnects.`
                      : selectedDeviceIsResponsive
                      ? "Sent to agent, awaiting result..."
                      : `The task was sent before the agent went offline (${selectedDeviceLastSeenLabel}); waiting for it to report back.`}
                  </div>
                ) : task.result ? (
                  <pre className="pl-4 text-xs text-[hsl(var(--terminal-foreground))] opacity-80 whitespace-pre-wrap break-all">{task.result}</pre>
                ) : null}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </ScrollArea>

        {/* Command input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/30 terminal-bg">
          <span className="text-success font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none text-[hsl(var(--terminal-foreground))] font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[hsl(var(--terminal-foreground))]/30"
            disabled={!selectedDeviceIsResponsive || createTask.isPending}
          />
          <Button
            size="sm"
            onClick={handleSendCommand}
            disabled={!cmdInput.trim() || createTask.isPending || !selectedDeviceIsResponsive}
            className="bg-primary hover:bg-primary/90 transition-colors"
          >
            {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      </div>
    );
  }

  // Device list view
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Device Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Corporate asset inventory and remote management</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-border/50 focus:border-primary transition-all"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="border-border/50 hover:border-primary/50 transition-colors">
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/30 shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Monitor className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No devices found</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">Devices will appear here once your Go VPS agents start sending heartbeats</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Target ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Status</TableHead>
                  <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">OS</TableHead>
                  <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Arch</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Public IP</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Last Seen</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {filtered.map((device) => (
                  <TableRow
                    key={device.id}
                    className="cursor-pointer table-row-hover border-border/20 transition-all duration-200 hover:bg-primary/5"
                    onClick={() => handleOpenTerminal(device)}
                  >
                    <TableCell className="font-mono text-sm font-medium text-foreground">{device.target_id}</TableCell>
                    <TableCell>
                      <StatusBadge status={device.status === "Online" ? "online" : "offline"} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{device.os_info || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{device.arch || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-mono text-muted-foreground">{device.public_ip || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {device.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleOpenTerminal(device); }}
                        className="hover:bg-success/10 hover:text-success transition-colors"
                      >
                        <Terminal className="h-4 w-4 mr-2" />
                        Terminal
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
