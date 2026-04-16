import { Terminal, X, Minus, Maximize2, ChevronUp } from "lucide-react";
import { useTerminals } from "@/components/TerminalContext";
import { useDevices } from "@/hooks/use-devices";
import { useTenant } from "@/hooks/use-tenant";
import { DeviceTerminal } from "@/components/DeviceTerminal";

export function TerminalTaskbar() {
  const {
    terminals,
    expandedTerminalId,
    closeTerminal,
    minimizeTerminal,
    restoreTerminal,
    expandTerminal,
    collapseExpanded,
  } = useTerminals();

  const { data: tenant } = useTenant();
  const { data: liveDevices } = useDevices(tenant?.tenantId);

  if (terminals.length === 0) return null;

  const expandedEntry = terminals.find(
    (t) => t.device.target_id === expandedTerminalId && !t.minimized
  );

  return (
    <>
      {/* Expanded terminal overlay */}
      {expandedEntry && (
        <div className="fixed inset-x-0 bottom-9 top-14 z-40 flex flex-col bg-[hsl(220,25%,10%)] border-t border-[hsl(220,25%,18%)] shadow-2xl animate-fade-in">
          <DeviceTerminal
            device={expandedEntry.device}
            liveDevices={liveDevices || []}
            onClose={() => closeTerminal(expandedEntry.device.target_id)}
            onMinimize={() => minimizeTerminal(expandedEntry.device.target_id)}
          />
        </div>
      )}

      {/* Bottom taskbar */}
      <div className="fixed bottom-0 inset-x-0 z-50 h-9 flex items-center gap-0.5 px-2 bg-[hsl(220,25%,8%)] border-t border-[hsl(220,25%,15%)]">
        <div className="flex items-center gap-1 mr-2">
          <Terminal className="h-3 w-3 text-success/60" />
          <span className="text-[10px] font-mono text-[hsl(var(--terminal-foreground))]/30">
            {terminals.length}/4
          </span>
        </div>

        {terminals.map((entry) => {
          const targetId = entry.device.target_id;
          const isExpanded = expandedTerminalId === targetId && !entry.minimized;
          const liveDevice = (liveDevices || []).find((d) => d.target_id === targetId);
          const isOnline = liveDevice
            ? (liveDevice.isResponsive ?? liveDevice.status === "Online")
            : false;

          return (
            <div
              key={targetId}
              className={`group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                isExpanded
                  ? "bg-[hsl(220,25%,20%)] text-[hsl(var(--terminal-foreground))]"
                  : entry.minimized
                    ? "text-[hsl(var(--terminal-foreground))]/30 hover:text-[hsl(var(--terminal-foreground))]/60 hover:bg-[hsl(220,25%,12%)]"
                    : "text-[hsl(var(--terminal-foreground))]/50 hover:text-[hsl(var(--terminal-foreground))]/80 hover:bg-[hsl(220,25%,15%)]"
              }`}
              onClick={() => {
                if (isExpanded) {
                  minimizeTerminal(targetId);
                } else if (entry.minimized) {
                  restoreTerminal(targetId);
                } else {
                  expandTerminal(targetId);
                }
              }}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  isOnline ? "bg-success" : "bg-muted-foreground/40"
                }`}
              />
              <span className="max-w-[120px] truncate">{targetId}</span>

              {/* Hover actions */}
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {entry.minimized ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreTerminal(targetId);
                    }}
                    className="p-0.5 rounded hover:bg-[hsl(var(--terminal-foreground))]/10"
                    title="Restore"
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </button>
                ) : !isExpanded ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      expandTerminal(targetId);
                    }}
                    className="p-0.5 rounded hover:bg-[hsl(var(--terminal-foreground))]/10"
                    title="Expand"
                  >
                    <Maximize2 className="h-2.5 w-2.5" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      minimizeTerminal(targetId);
                    }}
                    className="p-0.5 rounded hover:bg-[hsl(var(--terminal-foreground))]/10"
                    title="Minimize"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(targetId);
                  }}
                  className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
                  title="Close"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
