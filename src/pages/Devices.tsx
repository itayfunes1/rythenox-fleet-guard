import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Terminal, RefreshCw, Monitor, X, Minus } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices, type ManagedDevice } from "@/hooks/use-devices";
import { DeviceTerminal } from "@/components/DeviceTerminal";

interface TerminalTab {
  device: ManagedDevice;
  minimized: boolean;
}

export default function Devices() {
  const [search, setSearch] = useState("");
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading, refetch, isFetching } = useDevices(tenant?.tenantId);

  const filtered = (liveDevices || []).filter(
    (d) =>
      d.target_id.toLowerCase().includes(search.toLowerCase()) ||
      (d.os_info || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.public_ip || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenTerminal = (device: ManagedDevice) => {
    const existing = tabs.find((t) => t.device.target_id === device.target_id);
    if (existing) {
      // Restore if minimized, or just focus
      setTabs((prev) =>
        prev.map((t) =>
          t.device.target_id === device.target_id ? { ...t, minimized: false } : t
        )
      );
      setActiveTabId(device.target_id);
      return;
    }
    if (tabs.length >= 4) {
      // Close the oldest tab to make room
      const oldest = tabs[0];
      setTabs((prev) => [...prev.filter((t) => t.device.target_id !== oldest.device.target_id), { device, minimized: false }]);
    } else {
      setTabs((prev) => [...prev, { device, minimized: false }]);
    }
    setActiveTabId(device.target_id);
  };

  const handleMinimize = (targetId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.device.target_id === targetId ? { ...t, minimized: true } : t
      )
    );
    // Switch to another open tab or go to device list
    const remaining = tabs.filter((t) => t.device.target_id !== targetId && !t.minimized);
    setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].device.target_id : null);
  };

  const handleCloseTab = (targetId: string) => {
    setTabs((prev) => prev.filter((t) => t.device.target_id !== targetId));
    if (activeTabId === targetId) {
      const remaining = tabs.filter((t) => t.device.target_id !== targetId);
      const nextOpen = remaining.find((t) => !t.minimized);
      setActiveTabId(nextOpen ? nextOpen.device.target_id : null);
    }
  };

  const handleRestoreTab = (targetId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.device.target_id === targetId ? { ...t, minimized: false } : t
      )
    );
    setActiveTabId(targetId);
  };

  const activeTab = tabs.find((t) => t.device.target_id === activeTabId && !t.minimized);
  const showDeviceList = !activeTab;
  const minimizedTabs = tabs.filter((t) => t.minimized);

  // Tab bar (shown when there are any open terminals)
  const tabBar = tabs.length > 0 ? (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[hsl(220,25%,10%)] border-b border-[hsl(220,25%,15%)] overflow-x-auto">
      {/* Device list tab */}
      <button
        onClick={() => setActiveTabId(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
          showDeviceList
            ? "bg-[hsl(220,25%,18%)] text-[hsl(var(--terminal-foreground))]"
            : "text-[hsl(var(--terminal-foreground))]/50 hover:text-[hsl(var(--terminal-foreground))]/80 hover:bg-[hsl(220,25%,15%)]"
        }`}
      >
        <Monitor className="h-3 w-3" />
        Devices
      </button>

      <div className="w-px h-4 bg-[hsl(var(--terminal-foreground))]/10 mx-1" />

      {tabs.map((tab) => {
        const isActive = activeTabId === tab.device.target_id && !tab.minimized;
        const liveDevice = (liveDevices || []).find((d) => d.target_id === tab.device.target_id);
        const isOnline = liveDevice ? (liveDevice.isResponsive ?? liveDevice.status === "Online") : false;

        return (
          <div
            key={tab.device.target_id}
            className={`group flex items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-md text-xs font-mono transition-colors shrink-0 cursor-pointer ${
              isActive
                ? "bg-[hsl(220,25%,18%)] text-[hsl(var(--terminal-foreground))]"
                : tab.minimized
                  ? "text-[hsl(var(--terminal-foreground))]/30 hover:text-[hsl(var(--terminal-foreground))]/60 hover:bg-[hsl(220,25%,13%)]"
                  : "text-[hsl(var(--terminal-foreground))]/50 hover:text-[hsl(var(--terminal-foreground))]/80 hover:bg-[hsl(220,25%,15%)]"
            }`}
            onClick={() => tab.minimized ? handleRestoreTab(tab.device.target_id) : setActiveTabId(tab.device.target_id)}
          >
            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isOnline ? "bg-success" : "bg-muted-foreground/40"}`} />
            <span className="max-w-[120px] truncate">{tab.device.target_id}</span>
            {tab.minimized && (
              <span className="text-[10px] text-warning/60 ml-0.5">min</span>
            )}
            <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!tab.minimized && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMinimize(tab.device.target_id); }}
                  className="p-0.5 rounded hover:bg-[hsl(var(--terminal-foreground))]/10"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.device.target_id); }}
                className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={`flex flex-col ${tabs.length > 0 ? "h-[calc(100vh-4rem)]" : ""}`}>
      {tabBar}

      {/* Terminal panels — render all non-minimized, show only active */}
      {tabs.filter((t) => !t.minimized).map((tab) => (
        <div
          key={tab.device.target_id}
          className={`flex-1 flex-col ${activeTabId === tab.device.target_id ? "flex" : "hidden"}`}
        >
          <DeviceTerminal
            device={tab.device}
            liveDevices={liveDevices || []}
            onClose={() => handleCloseTab(tab.device.target_id)}
            onMinimize={() => handleMinimize(tab.device.target_id)}
          />
        </div>
      ))}

      {/* Device list (shown when no active terminal or tab bar present with devices tab) */}
      {showDeviceList && (
        <div className={`space-y-6 ${tabs.length > 0 ? "flex-1 overflow-auto p-6" : ""}`}>
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

          {/* Minimized tabs quick-restore bar */}
          {minimizedTabs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Minimized:</span>
              {minimizedTabs.map((tab) => (
                <Button
                  key={tab.device.target_id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreTab(tab.device.target_id)}
                  className="h-7 text-xs font-mono gap-1.5 border-border/50"
                >
                  <Terminal className="h-3 w-3" />
                  {tab.device.target_id}
                </Button>
              ))}
            </div>
          )}

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
                    {filtered.map((device) => {
                      const hasTab = tabs.some((t) => t.device.target_id === device.target_id);
                      return (
                        <TableRow
                          key={device.id}
                          className="cursor-pointer table-row-hover border-border/20 transition-all duration-200 hover:bg-primary/5"
                          onClick={() => handleOpenTerminal(device)}
                        >
                          <TableCell className="font-mono text-sm font-medium text-foreground">
                            {device.target_id}
                            {hasTab && <span className="ml-2 text-[10px] text-success">●</span>}
                          </TableCell>
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
