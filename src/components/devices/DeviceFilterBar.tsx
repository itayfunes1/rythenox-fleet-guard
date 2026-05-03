import { useMemo, useState } from "react";
import { Bookmark, Save, Tag, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import {
  useDeviceFilters,
  useSaveDeviceFilter,
  useDeleteDeviceFilter,
  type TagQuery,
  type DeviceFilter,
} from "@/hooks/use-device-tags";

interface Props {
  tenantId: string | undefined;
  allTags: string[];
  query: TagQuery;
  onChange: (q: TagQuery) => void;
}

type Mode = "all" | "any" | "none";

export function DeviceFilterBar({ tenantId, allTags, query, onChange }: Props) {
  const { user } = useAuth();
  const { data: filters = [] } = useDeviceFilters(tenantId);
  const saveFilter = useSaveDeviceFilter();
  const deleteFilter = useDeleteDeviceFilter();

  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<Mode>("all");
  const [saveOpen, setSaveOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterDesc, setFilterDesc] = useState("");

  const isEmpty = !(query.all?.length || query.any?.length || query.none?.length);

  const usedTags = useMemo(
    () => new Set([...(query.all ?? []), ...(query.any ?? []), ...(query.none ?? [])]),
    [query],
  );

  const toggleTag = (tag: string, mode: Mode) => {
    const next: TagQuery = {
      all: [...(query.all ?? [])],
      any: [...(query.any ?? [])],
      none: [...(query.none ?? [])],
    };
    (["all", "any", "none"] as Mode[]).forEach((k) => {
      next[k] = next[k]!.filter((t) => t !== tag);
    });
    if (!query[mode]?.includes(tag)) next[mode]!.push(tag);
    onChange(next);
  };

  const removeTag = (tag: string) => {
    onChange({
      all: (query.all ?? []).filter((t) => t !== tag),
      any: (query.any ?? []).filter((t) => t !== tag),
      none: (query.none ?? []).filter((t) => t !== tag),
    });
  };

  const applyFilter = (f: DeviceFilter) => {
    onChange(f.tag_query || {});
  };

  const handleSave = async () => {
    if (!tenantId || !user) return;
    if (filterName.trim().length < 2) {
      toast.error("Name is too short");
      return;
    }
    try {
      await saveFilter.mutateAsync({
        tenantId,
        userId: user.id,
        name: filterName.trim(),
        description: filterDesc.trim() || undefined,
        tag_query: query,
      });
      setSaveOpen(false);
      setFilterName("");
      setFilterDesc("");
      toast.success("Filter saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Filter by tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div className="flex gap-1">
              {(["all", "any", "none"] as Mode[]).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={pickerMode === m ? "default" : "outline"}
                  className="h-7 px-2 text-xs flex-1"
                  onClick={() => setPickerMode(m)}
                >
                  {m === "all" ? "Has all" : m === "any" ? "Has any" : "Excludes"}
                </Button>
              ))}
            </div>
            <div className="max-h-64 overflow-auto space-y-1">
              {allTags.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No tags yet. Add tags to devices first.
                </p>
              )}
              {allTags.map((t) => {
                const active = query[pickerMode]?.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t, pickerMode)}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-mono hover:bg-muted ${active ? "bg-primary/10 text-primary" : ""}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            Saved filters
            {filters.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{filters.length}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          {filters.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">No saved filters yet.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-auto">
              {filters.map((f) => (
                <div key={f.id} className="flex items-center gap-1 group">
                  <button
                    onClick={() => applyFilter(f)}
                    className="flex-1 text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                  >
                    <div className="font-medium">{f.name}</div>
                    {f.description && <div className="text-[10px] text-muted-foreground truncate">{f.description}</div>}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteFilter.mutate(f.id)}
                    title="Delete filter"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={isEmpty}>
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Filter name" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={filterDesc} onChange={(e) => setFilterDesc(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveFilter.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isEmpty && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})} className="gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}

      {/* Active chips */}
      {Array.from(usedTags).length > 0 && (
        <div className="flex flex-wrap gap-1 ml-1">
          {(query.all ?? []).map((t) => (
            <Badge key={`all-${t}`} variant="default" className="text-[10px] font-mono gap-1">
              {t}
              <button onClick={() => removeTag(t)}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ))}
          {(query.any ?? []).map((t) => (
            <Badge key={`any-${t}`} variant="secondary" className="text-[10px] font-mono gap-1">
              any:{t}
              <button onClick={() => removeTag(t)}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ))}
          {(query.none ?? []).map((t) => (
            <Badge key={`none-${t}`} variant="outline" className="text-[10px] font-mono gap-1 border-destructive/50 text-destructive">
              not:{t}
              <button onClick={() => removeTag(t)}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
