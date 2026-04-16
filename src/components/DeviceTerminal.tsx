import { useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, X, Loader2, ChevronRight, Circle, Clock, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { type ManagedDevice } from "@/hooks/use-devices";
import { useCreateTask, useDeviceTasks } from "@/hooks/use-tasks";
import { useStartSession, useEndSession } from "@/hooks/use-active-sessions";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLastSeenAge } from "@/lib/device-presence";
import { useState } from "react";

interface DeviceTerminalProps {
  device: ManagedDevice;
  liveDevices: ManagedDevice[];
  onClose: () => void;
}

export function DeviceTerminal({ device, liveDevices, onClose }: DeviceTerminalProps) {
  const [cmdInput, setCmdInput] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const createTask = useCreateTask();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const { data: deviceTasks } = useDeviceTasks(tenant?.tenantId, device.target_id);

  const currentDevice = liveDevices.find((d) => d.target_id === device.target_id) ?? device;
  const isResponsive = currentDevice.isResponsive ?? currentDevice.status === "Online";
  const lastSeenLabel = currentDevice.last_seen ? formatLastSeenAge(currentDevice.last_seen) : "an unknown time";

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [deviceTasks]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Start session on mount
  useEffect(() => {
    if (tenant?.tenantId && user?.id) {
      startSession.mutate(
        { tenant_id: tenant.tenantId, user_id: user.id, target_id: device.target_id },
        { onSuccess: (data) => setActiveSessionId(data.id) }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (activeSessionId) {
        supabase.from("active_sessions").delete().eq("id", activeSessionId).then();
      }
    };
  }, [activeSessionId]);

  const handleClose = useCallback(() => {
    if (activeSessionId) {
      endSession.mutate(activeSessionId);
      setActiveSessionId(null);
    }
    onClose();
  }, [activeSessionId, endSession, onClose]);

  const handleSendCommand = () => {
    if (!tenant?.tenantId || !cmdInput.trim()) return;

    if (!isResponsive) {
      toast({
        title: "Device offline",
        description: `No heartbeat received from ${currentDevice.target_id} for ${lastSeenLabel}. Commands will stay queued until the agent reconnects.`,
        variant: "destructive",
      });
      return;
    }

    createTask.mutate(
      { tenant_id: tenant.tenantId, target_id: currentDevice.target_id, command: cmdInput.trim() },
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending": return <Clock className="h-3 w-3 text-warning" />;
      case "Sent": return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      case "Completed": return <Circle className="h-3 w-3 fill-success text-success" />;
      case "Failed": return <Circle className="h-3 w-3 fill-destructive text-destructive" />;
      default: return null;
    }
  };

  const tasks = deviceTasks || [];

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--terminal-bg))] bg-[hsl(220,25%,10%)]">
        <div className="flex items-center gap-3">
          {/* macOS-style window controls */}
          <div className="flex items-center gap-1.5 mr-2">
            <button
              onClick={handleClose}
              className="h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition-all"
              aria-label="Close"
            />
            <button
              onClick={onMinimize}
              className="h-3 w-3 rounded-full bg-[#febc2e] hover:brightness-90 transition-all"
              aria-label="Minimize"
            />
            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-[hsl(var(--terminal-foreground))]/60" />
            <span className="text-xs font-medium font-mono text-[hsl(var(--terminal-foreground))]">
              {currentDevice.target_id}
            </span>
          </div>
          <StatusBadge status={isResponsive ? "online" : "offline"} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[hsl(var(--terminal-foreground))]/40">
            {currentDevice.public_ip || "—"} · {currentDevice.os_info || "—"} · {currentDevice.arch || "—"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-7 w-7 hover:bg-[hsl(var(--terminal-foreground))]/10 text-[hsl(var(--terminal-foreground))]/60 hover:text-[hsl(var(--terminal-foreground))]"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Terminal body */}
      <ScrollArea className="flex-1 terminal-bg">
        <div className="p-5 font-mono text-[13px] leading-relaxed space-y-1 min-h-full">
          {/* Welcome banner */}
          <div className="text-[hsl(var(--terminal-foreground))]/40 text-xs mb-4 space-y-0.5">
            <div>Connected to <span className="text-success">{currentDevice.target_id}</span></div>
            <div>Commands are queued and executed on the next agent poll cycle.</div>
          </div>

          {!isResponsive && (
            <div className="rounded border border-warning/20 bg-warning/5 px-3 py-2.5 text-xs text-warning mb-4 flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                No heartbeat received since {lastSeenLabel}. New commands are blocked until the agent reconnects.
              </span>
            </div>
          )}

          {/* Task entries */}
          {tasks.map((task) => (
            <div key={task.id} className="group">
              {/* Command line */}
              <div className="flex items-center gap-2 py-0.5">
                <ChevronRight className="h-3 w-3 text-success shrink-0" />
                <span className="text-[hsl(var(--terminal-foreground))]">{task.command}</span>
                <span className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {getStatusIcon(task.status)}
                  <span className="text-[10px] text-[hsl(var(--terminal-foreground))]/40">{task.status}</span>
                </span>
              </div>

              {/* Output */}
              {(task.status === "Pending" || task.status === "Sent") ? (
                <div className="flex items-center gap-2 pl-5 text-[hsl(var(--terminal-foreground))]/40 text-xs py-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>
                    {task.status === "Pending"
                      ? isResponsive
                        ? "Waiting for agent..."
                        : `Agent offline (${lastSeenLabel}) — queued`
                      : isResponsive
                        ? "Executing..."
                        : `Agent offline (${lastSeenLabel}) — awaiting result`}
                  </span>
                </div>
              ) : task.result ? (
                <pre className="pl-5 text-xs text-[hsl(var(--terminal-foreground))]/70 whitespace-pre-wrap break-all leading-relaxed py-0.5 terminal-output">
                  {task.result}
                </pre>
              ) : null}
            </div>
          ))}

          {/* Cursor blink */}
          {isResponsive && tasks.length > 0 && (
            <div className="flex items-center gap-2 py-0.5">
              <ChevronRight className="h-3 w-3 text-success" />
              <div className="w-2 h-4 bg-success/70 terminal-cursor" />
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-t border-[hsl(var(--terminal-foreground))]/5 terminal-bg">
        <ChevronRight className="h-3.5 w-3.5 text-success shrink-0" />
        <Input
          ref={inputRef}
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isResponsive ? "Enter command..." : "Agent offline"}
          className="flex-1 bg-transparent border-none text-[hsl(var(--terminal-foreground))] font-mono text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[hsl(var(--terminal-foreground))]/20 h-8 px-0"
          disabled={!isResponsive || createTask.isPending}
        />
        <Button
          size="sm"
          onClick={handleSendCommand}
          disabled={!cmdInput.trim() || createTask.isPending || !isResponsive}
          className="h-7 px-3 bg-success/20 hover:bg-success/30 text-success border-0 font-mono text-xs transition-colors"
        >
          {createTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
