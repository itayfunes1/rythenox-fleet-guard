import { useState } from "react";
import { devices as mockDevices, type Device } from "@/data/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Headset, FileText, Download, Search, AlertTriangle, Terminal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useDevices, type ManagedDevice } from "@/hooks/use-devices";
import { useCreateTask } from "@/hooks/use-tasks";
import { Textarea } from "@/components/ui/textarea";

export default function Devices() {
  const [search, setSearch] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedLiveDevice, setSelectedLiveDevice] = useState<ManagedDevice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [command, setCommand] = useState("");
  const { toast } = useToast();

  const { data: tenant } = useTenant();
  const { data: liveDevices } = useDevices(tenant?.tenantId);
  const createTask = useCreateTask();

  const hasLiveData = !!tenant?.tenantId && !!liveDevices && liveDevices.length > 0;

  // Mock device filtering
  const filteredMock = mockDevices.filter(
    (d) =>
      d.assetTag.toLowerCase().includes(search.toLowerCase()) ||
      d.assignedUser.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase())
  );

  // Live device filtering
  const filteredLive = liveDevices?.filter(
    (d) =>
      d.target_id.toLowerCase().includes(search.toLowerCase()) ||
      (d.os_info || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.public_ip || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleRemoteSupport = (device: Device) => {
    setSelectedDevice(device);
    setConsentOpen(true);
  };

  const confirmRemoteSupport = () => {
    setConsentOpen(false);
    toast({
      title: "Remote Support Initiated",
      description: `Session started for ${selectedDevice?.assetTag}. Notification sent to user.`,
    });
  };

  const handleViewLogs = (device: Device) => {
    setSelectedDevice(device);
    setDetailOpen(true);
  };

  const handleExecuteCommand = (device: ManagedDevice) => {
    setSelectedLiveDevice(device);
    setCommand("");
    setCommandOpen(true);
  };

  const submitCommand = () => {
    if (!tenant?.tenantId || !selectedLiveDevice || !command.trim()) return;
    createTask.mutate(
      { tenant_id: tenant.tenantId, target_id: selectedLiveDevice.target_id, command: command.trim() },
      {
        onSuccess: () => {
          setCommandOpen(false);
          toast({ title: "Task Created", description: `Command queued for ${selectedLiveDevice.target_id}` });
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

      {/* Live devices table */}
      {hasLiveData && (
        <Card>
          <CardContent className="p-0">
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
                {filteredLive.map((device) => (
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
          </CardContent>
        </Card>
      )}

      {/* Mock devices table (fallback / demo) */}
      {!hasLiveData && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Assigned User</TableHead>
                  <TableHead className="hidden md:table-cell">OS Version</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Check-in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMock.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-mono text-sm font-medium">{device.assetTag}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{device.assignedUser}</p>
                        <p className="text-xs text-muted-foreground">{device.department}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{device.osVersion}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{device.lastCheckIn}</TableCell>
                    <TableCell><StatusBadge status={device.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Remote Support" onClick={() => handleRemoteSupport(device)} disabled={device.status === "offline"}>
                          <Headset className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="View Logs" onClick={() => handleViewLogs(device)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Update Software" disabled={device.status === "offline"}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Consent Dialog */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Compliance Notice
            </DialogTitle>
            <DialogDescription>
              You are about to initiate a remote support session for <strong>{selectedDevice?.assetTag}</strong> ({selectedDevice?.assignedUser}).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/50 p-4 text-sm">
            <p className="font-medium text-foreground mb-1">User Notification</p>
            <p className="text-muted-foreground">This action will display a visible notification on the target device:</p>
            <p className="mt-2 italic text-foreground">"Your IT Administrator has initiated a support session."</p>
          </div>
          <div className="text-xs text-muted-foreground">Data access limited to: CPU load, RAM usage, disk health, and screen sharing (with user visibility).</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsentOpen(false)}>Cancel</Button>
            <Button onClick={confirmRemoteSupport}>Confirm & Notify User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Command Dialog */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-accent" />
              Execute Remote Command
            </DialogTitle>
            <DialogDescription>
              Send a command to <strong>{selectedLiveDevice?.target_id}</strong>. It will be queued and picked up by the agent.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter command..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommandOpen(false)}>Cancel</Button>
            <Button onClick={submitCommand} disabled={!command.trim() || createTask.isPending}>
              {createTask.isPending ? "Sending..." : "Execute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDevice?.assetTag} — System Health</SheetTitle>
          </SheetHeader>
          {selectedDevice && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">User:</span><p className="font-medium">{selectedDevice.assignedUser}</p></div>
                <div><span className="text-muted-foreground">Department:</span><p className="font-medium">{selectedDevice.department}</p></div>
                <div><span className="text-muted-foreground">Model:</span><p className="font-medium">{selectedDevice.model}</p></div>
                <div><span className="text-muted-foreground">OS:</span><p className="font-medium">{selectedDevice.osVersion}</p></div>
                <div><span className="text-muted-foreground">IP Address:</span><p className="font-mono">{selectedDevice.ipAddress}</p></div>
                <div><span className="text-muted-foreground">Last Check-in:</span><p className="font-medium">{selectedDevice.lastCheckIn}</p></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Diagnostics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span>CPU Usage</span><span>{selectedDevice.cpuUsage}%</span></div>
                    <Progress value={selectedDevice.cpuUsage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span>RAM Usage</span><span>{selectedDevice.ramUsage}%</span></div>
                    <Progress value={selectedDevice.ramUsage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span>Disk Health</span><span>{selectedDevice.diskHealth}%</span></div>
                    <Progress value={selectedDevice.diskHealth} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
