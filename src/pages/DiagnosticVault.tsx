import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Search, Download, Eye, FileImage, FileAudio, FileText } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDiagnosticFiles } from "@/hooks/use-diagnostic-files";

const typeIcons: Record<string, React.ReactNode> = {
  image: <FileImage className="h-4 w-4 text-accent" />,
  audio: <FileAudio className="h-4 w-4 text-warning" />,
  text: <FileText className="h-4 w-4 text-muted-foreground" />,
};

const typeBadgeColors: Record<string, string> = {
  image: "bg-accent/10 text-accent border-accent/30",
  audio: "bg-warning/10 text-warning border-warning/30",
  text: "bg-muted text-muted-foreground border-border",
};

export default function DiagnosticVault() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const { data: tenant } = useTenant();
  const { data: liveFiles, isLoading } = useDiagnosticFiles(tenant?.tenantId);

  const filtered = (liveFiles || []).filter((f) => {
    const matchesSearch = f.target_id.toLowerCase().includes(search.toLowerCase()) || f.file_url.toLowerCase().includes(search.toLowerCase());
    if (tab === "all") return matchesSearch;
    if (tab === "reports") return matchesSearch && f.type === "text";
    if (tab === "logs") return matchesSearch && f.type === "text";
    if (tab === "recordings") return matchesSearch && (f.type === "audio" || f.type === "image");
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diagnostic Vault</h1>
        <p className="text-sm text-muted-foreground">System reports, event logs, and support session recordings</p>
      </div>

      <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
        <strong>Data Scope Notice:</strong> All diagnostic data is limited to standard system metrics — CPU load, RAM usage, and disk health. No personal user data is collected.
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Files</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="reports">System Reports</TabsTrigger>
              <TabsTrigger value="logs">Event Logs</TabsTrigger>
              <TabsTrigger value="recordings">Recordings</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No diagnostic files found. Files will appear here when your agents upload diagnostics.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead className="hidden md:table-cell">Device</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeIcons[file.type]}
                            <span className="text-sm font-medium truncate max-w-[200px]">{file.file_url.split("/").pop()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm">{file.target_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeBadgeColors[file.type]}>{file.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{new Date(file.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild><a href={file.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a></Button>
                            <Button variant="ghost" size="icon" asChild><a href={file.file_url} download><Download className="h-4 w-4" /></a></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
