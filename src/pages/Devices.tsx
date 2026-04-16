import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Terminal, RefreshCw, Monitor } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices, type ManagedDevice } from "@/hooks/use-devices";
import { DeviceTerminal } from "@/components/DeviceTerminal";

export default function Devices() {
  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<ManagedDevice | null>(null);

  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading, refetch, isFetching } = useDevices(tenant?.tenantId);

  const filtered = (liveDevices || []).filter(
    (d) =>
      d.target_id.toLowerCase().includes(search.toLowerCase()) ||
      (d.os_info || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.public_ip || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenTerminal = (device: ManagedDevice) => {
    setSelectedDevice(device);
  };

  const handleCloseTerminal = () => {
    setSelectedDevice(null);
  };

  // Terminal view
  if (selectedDevice) {
    return (
      <DeviceTerminal
        device={selectedDevice}
        liveDevices={liveDevices || []}
        onClose={handleCloseTerminal}
      />
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
