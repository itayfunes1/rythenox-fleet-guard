import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Terminal, RefreshCw, X, Loader2 } from "lucide-react";
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

  // Cleanup session on unmount or page navigation
  useEffect(() => {
    return () => {
      if (activeSessionId) {
        // Fire-and-forget cleanup
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
        onSuccess: () => {
          setCmdInput("");
        },
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
      case "Pending": return "text-yellow-400";
      case "Sent": return "text-blue-400";
      case "Completed": return "text-green-400";
      case "Failed": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  // Terminal view
  if (currentSelectedDevice) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-green-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-foreground">{currentSelectedDevice.target_id}</h2>
              <p className="text-xs text-muted-foreground">
                {currentSelectedDevice.public_ip || "Unknown IP"} · {currentSelectedDevice.os_info || "Unknown OS"} · {currentSelectedDevice.arch || "Unknown Arch"}
              </p>
            </div>
            <StatusBadge status={selectedDeviceIsResponsive ? "online" : "offline"} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDevice(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Terminal body */}
        <ScrollArea className="flex-1 bg-[#0d1117]">
          <div className="p-4 font-mono text-sm space-y-3 min-h-full">
            <div className="text-green-400 text-xs">
              ── Connected to {currentSelectedDevice.target_id} ──
            </div>
            <div className="text-muted-foreground text-xs">
              Commands are queued and picked up by the agent on next poll cycle.
            </div>

            {!selectedDeviceIsResponsive && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                No heartbeat has been received from this agent since {selectedDeviceLastSeenLabel}. New commands are blocked until it reconnects and polls again.
              </div>
            )}

            {(deviceTasks || []).map((task) => (
              <div key={task.id} className="space-y-1">
                {/* Command line */}
                <div className="flex items-center gap-2">
                  <span className="text-green-400">$</span>
                  <span className="text-foreground">{task.command}</span>
                  <span className={`text-xs ml-auto ${getStatusColor(task.status)}`}>
                    [{task.status}]
                  </span>
                </div>
                {/* Result */}
                {task.status === "Pending" || task.status === "Sent" ? (
                  <div className="flex items-center gap-2 pl-4 text-muted-foreground text-xs">
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
                  <pre className="pl-4 text-xs text-muted-foreground whitespace-pre-wrap break-all">{task.result}</pre>
                ) : null}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </ScrollArea>

        {/* Command input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-[#0d1117]">
          <span className="text-green-400 font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none text-foreground font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            disabled={!selectedDeviceIsResponsive || createTask.isPending}
          />
          <Button
            size="sm"
            onClick={handleSendCommand}
            disabled={!cmdInput.trim() || createTask.isPending || !selectedDeviceIsResponsive}
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Device Management</h1>
        <p className="text-sm text-muted-foreground">Corporate asset inventory and remote management</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading devices...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No devices found. Devices will appear here once your Go VPS agents start sending heartbeats.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">OS</TableHead>
                  <TableHead className="hidden md:table-cell">Arch</TableHead>
                  <TableHead className="hidden lg:table-cell">Public IP</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((device) => (
                  <TableRow
                    key={device.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => handleOpenTerminal(device)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{device.target_id}</TableCell>
                    <TableCell>
                      <StatusBadge status={device.status === "Online" ? "online" : "offline"} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{device.os_info || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{device.arch || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-mono">{device.public_ip || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {device.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleOpenTerminal(device); }}
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
