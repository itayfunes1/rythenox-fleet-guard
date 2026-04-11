import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, ScrollText } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useTasks } from "@/hooks/use-tasks";

export default function Compliance() {
  const { data: tenant } = useTenant();
  const { data: liveTasks, isLoading } = useTasks(tenant?.tenantId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Compliance & Consent</h1>
        <p className="text-sm text-muted-foreground">Audit log and data governance policies</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 stagger-children">
        <Card className="glass-card glow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              Consent Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground">All remote actions trigger a visible end-user notification:</p>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 italic text-foreground text-sm">
              "Your IT Administrator has initiated a support session."
            </div>
            <p className="text-muted-foreground text-xs">Users can see when their device is being accessed and the scope of data collected.</p>
          </CardContent>
        </Card>

        <Card className="glass-card glow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              Data Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground">All data collection is limited to standard system diagnostics:</p>
            <ul className="list-none text-muted-foreground space-y-2">
              {["CPU load and process counts", "RAM usage statistics", "Disk health metrics (S.M.A.R.T.)", "Screen sharing (with visible indicator)"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3 w-3 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground/60 font-medium">No personal files, browsing history, or private data is ever accessed.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Audit Log</CardTitle>
          </div>
          <CardDescription>Complete record of all remote management actions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/30 shimmer" />
              ))}
            </div>
          ) : !liveTasks || liveTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <ScrollText className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No audit entries yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Remote commands will be logged here automatically</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Timestamp</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Command</TableHead>
                  <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Target</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Consent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {liveTasks.map((task) => (
                  <TableRow key={task.id} className="border-border/20 table-row-hover">
                    <TableCell className="text-sm font-mono text-muted-foreground">{new Date(task.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-medium truncate max-w-[200px]">{task.command}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono text-muted-foreground">{task.target_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] rounded-full ${
                        task.status === "Completed" ? "border-success/20 bg-success/10 text-success" :
                        task.status === "Failed" ? "border-destructive/20 bg-destructive/10 text-destructive" :
                        "border-warning/20 bg-warning/10 text-warning"
                      }`}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-success/20 bg-success/10 text-success text-[10px] rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Shown
                      </Badge>
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
