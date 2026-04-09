import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices, type ManagedDevice } from "@/hooks/use-devices";
import { useCreateTask } from "@/hooks/use-tasks";
import { Textarea } from "@/components/ui/textarea";

export default function Devices() {
  const [search, setSearch] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ManagedDevice | null>(null);
  const [command, setCommand] = useState("");
  const { toast } = useToast();

  const { data: tenant } = useTenant();
  const { data: liveDevices, isLoading } = useDevices(tenant?.tenantId);
  const createTask = useCreateTask();

  const filtered = (liveDevices || []).filter(
    (d) =>
      d.target_id.toLowerCase().includes(search.toLowerCase()) ||
      (d.os_info || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.public_ip || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleExecuteCommand = (device: ManagedDevice) => {
    setSelectedDevice(device);
    setCommand("");
    setCommandOpen(true);
  };

  const submitCommand = () => {
    if (!tenant?.tenantId || !selectedDevice || !command.trim()) return;
    createTask.mutate(
      { tenant_id: tenant.tenantId, target_id: selectedDevice.target_id, command: command.trim() },
      {
        onSuccess: () => {
          setCommandOpen(false);
          toast({ title: "Task Created", description: `Command queued for ${selectedDevice.target_id}` });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        },
      }
    );
  };

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
                  <TableRow key={device.id}>
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
                      <Button variant="ghost" size="icon" title="Execute Command" onClick={() => handleExecuteCommand(device)} disabled={device.status === "Offline"}>
                        <Terminal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-accent" />
              Execute Remote Command
            </DialogTitle>
            <DialogDescription>
              Send a command to <strong>{selectedDevice?.target_id}</strong>. It will be queued and picked up by the agent.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Enter command..." value={command} onChange={(e) => setCommand(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommandOpen(false)}>Cancel</Button>
            <Button onClick={submitCommand} disabled={!command.trim() || createTask.isPending}>
              {createTask.isPending ? "Sending..." : "Execute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
