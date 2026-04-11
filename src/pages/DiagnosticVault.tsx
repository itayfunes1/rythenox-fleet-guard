import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Search, Download, Eye, FileImage, FileAudio, FileText,
  FolderArchive, Grid3X3, List, MoreVertical, Copy, Filter,
  Image as ImageIcon, Music, FileType, X
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDiagnosticFiles, DiagnosticEntry } from "@/hooks/use-diagnostic-files";
import { toast } from "@/hooks/use-toast";

type ViewMode = "grid" | "list";
type TypeFilter = "all" | "image" | "audio" | "text";

const typeIcons: Record<string, React.ReactNode> = {
  image: <FileImage className="h-4 w-4 text-primary" />,
  audio: <FileAudio className="h-4 w-4 text-[hsl(var(--warning))]" />,
  text: <FileText className="h-4 w-4 text-muted-foreground" />,
};

const typeBadgeColors: Record<string, string> = {
  image: "bg-primary/10 text-primary border-primary/20",
  audio: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  text: "bg-muted text-muted-foreground border-border/50",
};

function getFileName(url: string) {
  return url.split("/").pop() || url;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast({ title: "Copied", description: "Resource link copied to clipboard." });
}

function downloadFile(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function AssetActions({ file }: { file: DiagnosticEntry }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-border/30">
        <DropdownMenuItem onClick={() => copyToClipboard(file.file_url)} className="gap-2 cursor-pointer">
          <Copy className="h-4 w-4" /> Copy Resource Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile(file.file_url, getFileName(file.file_url))} className="gap-2 cursor-pointer">
          <Download className="h-4 w-4" /> Download
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ImagePreviewDialog({ file, open, onClose }: { file: DiagnosticEntry | null; open: boolean; onClose: () => void }) {
  if (!file) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium truncate">{getFileName(file.file_url)}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <img
            src={file.file_url}
            alt={getFileName(file.file_url)}
            className="w-full rounded-lg object-contain max-h-[70vh]"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Device: <span className="font-mono">{file.target_id}</span> · {new Date(file.created_at).toLocaleString()}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function TextPreviewSheet({ file, open, onClose }: { file: DiagnosticEntry | null; open: boolean; onClose: () => void }) {
  if (!file) return null;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="glass-card border-border/30 w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-sm font-medium truncate">{getFileName(file.file_url)}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Device: <span className="font-mono">{file.target_id}</span> · {new Date(file.created_at).toLocaleString()}
          </p>
          <ScrollArea className="h-[calc(100vh-10rem)] rounded-lg border border-border/30 bg-[hsl(var(--terminal-bg))] p-4">
            <iframe
              src={file.file_url}
              title={getFileName(file.file_url)}
              className="w-full min-h-[60vh] bg-transparent text-foreground"
              sandbox=""
            />
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AudioPreviewDialog({ file, open, onClose }: { file: DiagnosticEntry | null; open: boolean; onClose: () => void }) {
  if (!file) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium truncate">{getFileName(file.file_url)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="h-20 w-20 rounded-2xl bg-[hsl(var(--warning))]/10 flex items-center justify-center">
            <Music className="h-10 w-10 text-[hsl(var(--warning))]" />
          </div>
          <audio controls className="w-full" src={file.file_url}>
            Your browser does not support audio playback.
          </audio>
          <p className="text-xs text-muted-foreground">
            Device: <span className="font-mono">{file.target_id}</span> · {new Date(file.created_at).toLocaleString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Grid card for a single asset
function AssetGridCard({ file, onPreview }: { file: DiagnosticEntry; onPreview: (f: DiagnosticEntry) => void }) {
  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => onPreview(file)}
    >
      <div className="relative">
        {file.type === "image" ? (
          <AspectRatio ratio={16 / 10}>
            <img
              src={file.file_url}
              alt={getFileName(file.file_url)}
              className="object-cover w-full h-full rounded-t-lg group-hover:scale-105 transition-transform duration-500"
            />
          </AspectRatio>
        ) : file.type === "audio" ? (
          <AspectRatio ratio={16 / 10}>
            <div className="w-full h-full flex items-center justify-center bg-[hsl(var(--warning))]/5 rounded-t-lg">
              <div className="h-14 w-14 rounded-2xl bg-[hsl(var(--warning))]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Music className="h-7 w-7 text-[hsl(var(--warning))]" />
              </div>
            </div>
          </AspectRatio>
        ) : (
          <AspectRatio ratio={16 / 10}>
            <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-t-lg">
              <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
          </AspectRatio>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 rounded-t-lg">
          <Button size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); onPreview(file); }}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium truncate max-w-[70%]">{getFileName(file.file_url)}</p>
          <AssetActions file={file} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${typeBadgeColors[file.type]} text-[10px] rounded-full`}>
            {file.type.toUpperCase()}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-mono truncate">{file.target_id}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60">{new Date(file.created_at).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

export default function DiagnosticVault() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Preview state
  const [imagePreview, setImagePreview] = useState<DiagnosticEntry | null>(null);
  const [textPreview, setTextPreview] = useState<DiagnosticEntry | null>(null);
  const [audioPreview, setAudioPreview] = useState<DiagnosticEntry | null>(null);

  const { data: tenant } = useTenant();
  const { data: liveFiles, isLoading } = useDiagnosticFiles(tenant?.tenantId);

  const filtered = useMemo(() => {
    return (liveFiles || []).filter((f) => {
      const matchesSearch =
        f.target_id.toLowerCase().includes(search.toLowerCase()) ||
        f.file_url.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || f.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [liveFiles, search, typeFilter]);

  const stats = useMemo(() => {
    const all = liveFiles || [];
    return {
      total: all.length,
      images: all.filter((f) => f.type === "image").length,
      audio: all.filter((f) => f.type === "audio").length,
      text: all.filter((f) => f.type === "text").length,
    };
  }, [liveFiles]);

  function handlePreview(file: DiagnosticEntry) {
    if (file.type === "image") setImagePreview(file);
    else if (file.type === "text") setTextPreview(file);
    else if (file.type === "audio") setAudioPreview(file);
  }

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Diagnostic Vault</h1>
        <p className="text-sm text-muted-foreground">Browse, preview, and manage diagnostic assets from your fleet</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: stats.total, icon: FolderArchive, color: "text-primary" },
          { label: "Images", value: stats.images, icon: ImageIcon, color: "text-primary" },
          { label: "Audio", value: stats.audio, icon: Music, color: "text-[hsl(var(--warning))]" },
          { label: "Text Files", value: stats.text, icon: FileType, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Data scope notice */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FolderArchive className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm mb-1">Data Scope Notice</p>
          <p>All diagnostic data is limited to standard system metrics — CPU load, RAM usage, and disk health. No personal user data is collected.</p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by device ID or filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50 focus:border-primary transition-all"
              />
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <ToggleGroup
                type="single"
                value={typeFilter}
                onValueChange={(v) => v && setTypeFilter(v as TypeFilter)}
                className="bg-muted/20 rounded-lg p-0.5"
              >
                <ToggleGroupItem value="all" className="text-xs px-3 h-8 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="image" className="text-xs px-3 h-8 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all gap-1">
                  <ImageIcon className="h-3 w-3" /> Image
                </ToggleGroupItem>
                <ToggleGroupItem value="audio" className="text-xs px-3 h-8 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all gap-1">
                  <Music className="h-3 w-3" /> Audio
                </ToggleGroupItem>
                <ToggleGroupItem value="text" className="text-xs px-3 h-8 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all gap-1">
                  <FileType className="h-3 w-3" /> Text
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as ViewMode)}
                className="bg-muted/20 rounded-lg p-0.5"
              >
                <ToggleGroupItem value="grid" className="h-8 w-8 p-0 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" className="h-8 w-8 p-0 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content area */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-muted/20 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <FolderArchive className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No diagnostic files found</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
              {search || typeFilter !== "all"
                ? "Try adjusting your filters or search query."
                : "Files will appear here when your agents upload diagnostics."}
            </p>
            {(search || typeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 gap-1.5 text-xs"
                onClick={() => { setSearch(""); setTypeFilter("all"); }}
              >
                <X className="h-3 w-3" /> Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* ─── Grid View ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filtered.map((file) => (
            <AssetGridCard key={file.id} file={file} onPreview={handlePreview} />
          ))}
        </div>
      ) : (
        /* ─── List View ─── */
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">File</TableHead>
                  <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Device ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Type</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Timestamp</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {filtered.map((file) => (
                  <TableRow
                    key={file.id}
                    className="border-border/20 table-row-hover cursor-pointer"
                    onClick={() => handlePreview(file)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {typeIcons[file.type]}
                        <span className="text-sm font-medium truncate max-w-[200px]">{getFileName(file.file_url)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">{file.target_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${typeBadgeColors[file.type]} text-[10px] rounded-full`}>
                        {file.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {new Date(file.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handlePreview(file)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AssetActions file={file} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Preview modals */}
      <ImagePreviewDialog file={imagePreview} open={!!imagePreview} onClose={() => setImagePreview(null)} />
      <TextPreviewSheet file={textPreview} open={!!textPreview} onClose={() => setTextPreview(null)} />
      <AudioPreviewDialog file={audioPreview} open={!!audioPreview} onClose={() => setAudioPreview(null)} />
    </div>
  );
}
