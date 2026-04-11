import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Search, Download, Eye, FileImage, FileAudio, FileText, FolderArchive } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDiagnosticFiles } from "@/hooks/use-diagnostic-files";

const typeIcons: Record<string, React.ReactNode> = {
  image: <FileImage className="h-4 w-4 text-primary" />,
  audio: <FileAudio className="h-4 w-4 text-warning" />,
  text: <FileText className="h-4 w-4 text-muted-foreground" />,
};

const typeBadgeColors: Record<string, string> = {
  image: "bg-primary/10 text-primary border-primary/20",
  audio: "bg-warning/10 text-warning border-warning/20",
  text: "bg-muted text-muted-foreground border-border/50",
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
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Diagnostic Vault</h1>
        <p className="text-sm text-muted-foreground">System reports, event logs, and support session recordings</p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FolderArchive className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm mb-1">Data Scope Notice</p>
          <p>All diagnostic data is limited to standard system metrics — CPU load, RAM usage, and disk health. No personal user data is collected.</p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold">Files</CardTitle>
            <div className="relative max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/30 border-border/50 focus:border-primary transition-all" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/30">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="reports">System Reports</TabsTrigger>
              <TabsTrigger value="logs">Event Logs</TabsTrigger>
              <TabsTrigger value="recordings">Recordings</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted/30 shimmer" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <FolderArchive className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No diagnostic files found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Files will appear here when your agents upload diagnostics</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">File</TableHead>
                      <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Device</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Type</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Date</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="stagger-children">
                    {filtered.map((file) => (
                      <TableRow key={file.id} className="border-border/20 table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeIcons[file.type]}
                            <span className="text-sm font-medium truncate max-w-[200px]">{file.file_url.split("/").pop()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">{file.target_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${typeBadgeColors[file.type]} text-[10px] rounded-full`}>{file.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{new Date(file.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild className="hover:bg-primary/10 hover:text-primary transition-colors"><a href={file.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a></Button>
                            <Button variant="ghost" size="icon" asChild className="hover:bg-success/10 hover:text-success transition-colors"><a href={file.file_url} download><Download className="h-4 w-4" /></a></Button>
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
