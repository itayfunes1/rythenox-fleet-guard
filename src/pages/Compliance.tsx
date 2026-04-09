import { auditLog as mockAuditLog } from "@/data/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useTasks, type RemoteTask } from "@/hooks/use-tasks";

export default function Compliance() {
  const { data: tenant } = useTenant();
  const { data: liveTasks } = useTasks(tenant?.tenantId);

  const hasLiveData = !!tenant?.tenantId && !!liveTasks && liveTasks.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compliance & Consent</h1>
        <p className="text-sm text-muted-foreground">Audit log and data governance policies</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" /> Consent Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground">All remote actions trigger a visible end-user notification:</p>
            <div className="rounded-md border bg-muted/50 p-3 italic text-foreground">
              "Your IT Administrator has initiated a support session."
            </div>
            <p className="text-muted-foreground">Users can see when their device is being accessed and the scope of data collected.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" /> Data Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground">All data collection is limited to standard system diagnostics:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>CPU load and process counts</li>
              <li>RAM usage statistics</li>
              <li>Disk health metrics (S.M.A.R.T.)</li>
              <li>Screen sharing (with visible indicator)</li>
            </ul>
            <p className="text-xs text-muted-foreground font-medium">No personal files, browsing history, or private data is ever accessed.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Complete record of all remote management actions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {hasLiveData ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Command</TableHead>
                  <TableHead className="hidden md:table-cell">Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Consent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-sm font-mono">{new Date(task.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-medium truncate max-w-[200px]">{task.command}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono">{task.target_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        task.status === "Completed" ? "border-success/30 bg-success/10 text-success" :
                        task.status === "Failed" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                        "border-warning/30 bg-warning/10 text-warning"
                      }>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> Shown
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Admin</TableHead>
                  <TableHead className="hidden lg:table-cell">Target</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead className="hidden md:table-cell">Data Scope</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAuditLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm font-mono">{entry.timestamp}</TableCell>
                    <TableCell className="text-sm font-medium">{entry.action}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{entry.admin}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{entry.target}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> Shown
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{entry.dataScope}</TableCell>
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
