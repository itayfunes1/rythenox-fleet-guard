import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Terminal, RefreshCw, Monitor, Pencil, Check, X } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices, useUpdateNickname, type ManagedDevice } from "@/hooks/use-devices";
import { useTerminals } from "@/components/TerminalContext";
import { DeviceTagsCell } from "@/components/devices/DeviceTagsCell";
import { DeviceFilterBar } from "@/components/devices/DeviceFilterBar";
import { matchesTagQuery, type TagQuery } from "@/hooks/use-device-tags";

export default function Devices() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [tagQuery, setTagQuery] = useState<TagQuery>({});

  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading, refetch, isFetching } = useDevices(tenant?.tenantId);
  const { sessions, openTerminal } = useTerminals();
  const updateNickname = useUpdateNickname();

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (liveDevices || []).forEach((d) => (d.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [liveDevices]);

  const filtered = (liveDevices || []).filter((d) => {
    const text = search.toLowerCase();
    const matchesText =
      !text ||
      d.target_id.toLowerCase().includes(text) ||
      (d.nickname || "").toLowerCase().includes(text) ||
      (d.os_info || "").toLowerCase().includes(text) ||
      (d.public_ip || "").toLowerCase().includes(text) ||
      (d.tags || []).some((t) => t.includes(text));
    return matchesText && matchesTagQuery(d.tags || [], tagQuery);
  });

  const handleOpenTerminal = (device: ManagedDevice) => openTerminal(device);

  const startEditing = (device: ManagedDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(device.id);
    setNicknameInput(device.nickname || "");
  };

  const saveNickname = (deviceId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateNickname.mutate({ id: deviceId, nickname: nicknameInput.trim() || null });
    setEditingId(null);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  const addTagToFilter = (tag: string) => {
    const current = tagQuery.all ?? [];
    if (current.includes(tag)) return;
    setTagQuery({ ...tagQuery, all: [...current, tag] });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Device Management</h1>
        <p className="text-sm text-muted-foreground">Corporate asset inventory and remote management</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
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

      <DeviceFilterBar
        tenantId={tenant?.tenantId}
        allTags={allTags}
        query={tagQuery}
        onChange={setTagQuery}
      />

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
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                {liveDevices && liveDevices.length > 0
                  ? "No devices match the current search or tag filter."
                  : "Devices will appear here once your Go VPS agents start sending heartbeats"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Device</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Tags</TableHead>
                  <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">OS</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Public IP</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Last Seen</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {filtered.map((device) => {
                  const hasTab = sessions.some((s) => s.device.target_id === device.target_id);
                  const isEditing = editingId === device.id;
                  return (
                    <TableRow
                      key={device.id}
                      className="cursor-pointer table-row-hover border-border/20 transition-all duration-200 hover:bg-primary/5"
                      onClick={() => handleOpenTerminal(device)}
                    >
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={nicknameInput}
                              onChange={(e) => setNicknameInput(e.target.value)}
                              placeholder={device.target_id}
                              className="h-7 text-sm w-40"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveNickname(device.id);
                                if (e.key === "Escape") cancelEditing();
                              }}
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => saveNickname(device.id, e)}>
                              <Check className="h-3 w-3 text-success" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => cancelEditing(e)}>
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/name">
                            <div>
                              <div className="font-mono text-sm font-medium text-foreground">
                                {device.nickname || device.target_id}
                                {hasTab && <span className="ml-2 text-[10px] text-success">●</span>}
                              </div>
                              {device.nickname && (
                                <div className="text-[10px] text-muted-foreground font-mono">{device.target_id}</div>
                              )}
                            </div>
                            <button
                              onClick={(e) => startEditing(device, e)}
                              className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={device.status === "Online" ? "online" : "offline"} />
                      </TableCell>
                      <TableCell>
                        <DeviceTagsCell
                          targetId={device.target_id}
                          tags={device.tags || []}
                          onTagClick={addTagToFilter}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{device.os_info || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-mono text-muted-foreground">{device.public_ip || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {device.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleOpenTerminal(device); }}
                          disabled={sessions.length >= 4 && !hasTab}
                          className="hover:bg-success/10 hover:text-success transition-colors"
                        >
                          <Terminal className="h-4 w-4 mr-2" />
                          {hasTab ? "Focus" : "Terminal"}
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
  );
}
