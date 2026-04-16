import { useTerminals } from "@/components/TerminalContext";
import { useDevices } from "@/hooks/use-devices";
import { useTenant } from "@/hooks/use-tenant";
import { DeviceTerminal } from "@/components/DeviceTerminal";
import { Terminal, X, Minus, Maximize2 } from "lucide-react";

export function TerminalTaskbar() {
  const { sessions, closeTerminal, toggleMinimize, restoreTerminal } = useTerminals();
  const { data: tenant } = useTenant();
  const { data: liveDevices } = useDevices(tenant?.tenantId);

  if (sessions.length === 0) return null;

  const expandedSessions = sessions.filter((s) => !s.minimized);

  const getGridClass = (count: number) => {
    switch (count) {
      case 1: return "grid-cols-1";
      case 2: return "grid-cols-2";
      case 3: return "grid-cols-2 grid-rows-2";
      case 4: return "grid-cols-2 grid-rows-2";
      default: return "grid-cols-1";
    }
  };

  return (
    <>
      {/* Expanded terminal overlay */}
      {expandedSessions.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[hsl(220,25%,8%)]/95 backdrop-blur-sm">
          <div className={`flex-1 grid ${getGridClass(expandedSessions.length)} gap-px bg-[hsl(220,25%,15%)] overflow-hidden`}>
            {expandedSessions.map((session) => (
              <div key={session.device.target_id} className="flex flex-col min-h-0 overflow-hidden">
                <DeviceTerminal
                  device={session.device}
                  liveDevices={liveDevices || []}
                  onClose={() => closeTerminal(session.device.target_id)}
                  onMinimize={() => toggleMinimize(session.device.target_id)}
                />
              </div>
            ))}
            {expandedSessions.length === 3 && (
              <div className="terminal-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-[hsl(var(--terminal-foreground))]/20">
                  <Terminal className="h-6 w-6" />
                  <span className="text-xs font-mono">Empty slot</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Windows-style taskbar */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex items-center gap-1 px-2 py-1.5 bg-card border-t border-border shadow-lg">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        {sessions.map((session) => {
          const device = (liveDevices || []).find((d) => d.target_id === session.device.target_id) ?? session.device;
          const label = device.nickname || device.target_id;
          const isActive = !session.minimized;

          return (
            <button
              key={session.device.target_id}
              onClick={() => toggleMinimize(session.device.target_id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all max-w-[200px] group ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
              }`}
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${device.isResponsive ? "bg-success" : "bg-muted-foreground/40"}`} />
              <span className="truncate">{label}</span>
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {session.minimized ? (
                  <Maximize2 className="h-3 w-3 hover:text-primary" onClick={(e) => { e.stopPropagation(); restoreTerminal(session.device.target_id); }} />
                ) : (
                  <Minus className="h-3 w-3 hover:text-primary" onClick={(e) => { e.stopPropagation(); toggleMinimize(session.device.target_id); }} />
                )}
                <X
                  className="h-3 w-3 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); closeTerminal(session.device.target_id); }}
                />
              </div>
            </button>
          );
        })}
        <div className="ml-auto text-[10px] text-muted-foreground font-mono">
          {sessions.length}/4
        </div>
      </div>
    </>
  );
}
