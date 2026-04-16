import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type ManagedDevice } from "@/hooks/use-devices";

interface TerminalSession {
  device: ManagedDevice;
  minimized: boolean;
}

interface TerminalContextValue {
  sessions: TerminalSession[];
  openTerminal: (device: ManagedDevice) => void;
  closeTerminal: (targetId: string) => void;
  toggleMinimize: (targetId: string) => void;
  restoreTerminal: (targetId: string) => void;
  minimizeTerminal: (targetId: string) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

export function useTerminals() {
  const ctx = useContext(TerminalContext);
  if (!ctx) throw new Error("useTerminals must be used inside TerminalProvider");
  return ctx;
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);

  const openTerminal = useCallback((device: ManagedDevice) => {
    setSessions((prev) => {
      // Reuse existing session for same device
      const existing = prev.find((s) => s.device.target_id === device.target_id);
      if (existing) {
        return prev.map((s) =>
          s.device.target_id === device.target_id ? { ...s, minimized: false, device } : s
        );
      }
      if (prev.length >= 4) return prev;
      return [...prev, { device, minimized: false }];
    });
  }, []);

  const closeTerminal = useCallback((targetId: string) => {
    setSessions((prev) => prev.filter((s) => s.device.target_id !== targetId));
  }, []);

  const toggleMinimize = useCallback((targetId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.device.target_id === targetId ? { ...s, minimized: !s.minimized } : s
      )
    );
  }, []);

  const restoreTerminal = useCallback((targetId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.device.target_id === targetId ? { ...s, minimized: false } : s
      )
    );
  }, []);

  const minimizeTerminal = useCallback((targetId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.device.target_id === targetId ? { ...s, minimized: true } : s
      )
    );
  }, []);

  return (
    <TerminalContext.Provider value={{ sessions, openTerminal, closeTerminal, toggleMinimize, restoreTerminal, minimizeTerminal }}>
      {children}
    </TerminalContext.Provider>
  );
}
