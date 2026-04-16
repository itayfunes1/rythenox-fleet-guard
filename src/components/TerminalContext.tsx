import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type ManagedDevice } from "@/hooks/use-devices";

interface TerminalEntry {
  device: ManagedDevice;
  minimized: boolean;
}

interface TerminalContextValue {
  terminals: TerminalEntry[];
  expandedTerminalId: string | null;
  openTerminal: (device: ManagedDevice) => void;
  closeTerminal: (targetId: string) => void;
  minimizeTerminal: (targetId: string) => void;
  restoreTerminal: (targetId: string) => void;
  expandTerminal: (targetId: string) => void;
  collapseExpanded: () => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

export function useTerminals() {
  const ctx = useContext(TerminalContext);
  if (!ctx) throw new Error("useTerminals must be used within TerminalProvider");
  return ctx;
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [terminals, setTerminals] = useState<TerminalEntry[]>([]);
  const [expandedTerminalId, setExpandedTerminalId] = useState<string | null>(null);

  const openTerminal = useCallback((device: ManagedDevice) => {
    setTerminals((prev) => {
      if (prev.some((t) => t.device.target_id === device.target_id)) {
        // Restore if minimized
        return prev.map((t) =>
          t.device.target_id === device.target_id ? { ...t, minimized: false } : t
        );
      }
      if (prev.length >= 4) return prev; // max 4
      return [...prev, { device, minimized: false }];
    });
    setExpandedTerminalId(device.target_id);
  }, []);

  const closeTerminal = useCallback((targetId: string) => {
    setTerminals((prev) => prev.filter((t) => t.device.target_id !== targetId));
    setExpandedTerminalId((prev) => (prev === targetId ? null : prev));
  }, []);

  const minimizeTerminal = useCallback((targetId: string) => {
    setTerminals((prev) =>
      prev.map((t) =>
        t.device.target_id === targetId ? { ...t, minimized: true } : t
      )
    );
    setExpandedTerminalId((prev) => (prev === targetId ? null : prev));
  }, []);

  const restoreTerminal = useCallback((targetId: string) => {
    setTerminals((prev) =>
      prev.map((t) =>
        t.device.target_id === targetId ? { ...t, minimized: false } : t
      )
    );
    setExpandedTerminalId(targetId);
  }, []);

  const expandTerminal = useCallback((targetId: string) => {
    setExpandedTerminalId(targetId);
  }, []);

  const collapseExpanded = useCallback(() => {
    setExpandedTerminalId(null);
  }, []);

  return (
    <TerminalContext.Provider
      value={{
        terminals,
        expandedTerminalId,
        openTerminal,
        closeTerminal,
        minimizeTerminal,
        restoreTerminal,
        expandTerminal,
        collapseExpanded,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}
