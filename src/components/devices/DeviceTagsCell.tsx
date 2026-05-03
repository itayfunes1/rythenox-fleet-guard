import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TAG_REGEX, useSetDeviceTags } from "@/hooks/use-device-tags";

interface Props {
  targetId: string;
  tags: string[];
  onTagClick?: (tag: string) => void;
}

export function DeviceTagsCell({ targetId, tags, onTagClick }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const setTags = useSetDeviceTags();

  const addTag = async () => {
    const t = draft.trim().toLowerCase();
    if (!t) return;
    if (!TAG_REGEX.test(t)) {
      toast.error("Use lowercase letters/numbers, optional key:value (e.g. env:prod)");
      return;
    }
    if (tags.includes(t)) {
      setDraft("");
      return;
    }
    try {
      await setTags.mutateAsync({ targetId, tags: [...tags, t] });
      setDraft("");
    } catch (e: any) {
      toast.error(e.message || "Failed to add tag");
    }
  };

  const removeTag = async (tag: string) => {
    try {
      await setTags.mutateAsync({ targetId, tags: tags.filter((x) => x !== tag) });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove tag");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {tags.map((t) => (
        <Badge
          key={t}
          variant="secondary"
          className="text-[10px] font-mono cursor-pointer group/tag"
          onClick={() => onTagClick?.(t)}
        >
          {t}
          <button
            onClick={(e) => { e.stopPropagation(); removeTag(t); }}
            className="ml-1 opacity-50 hover:opacity-100"
            title="Remove tag"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5" title="Add tag">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Add tag</p>
            <Input
              placeholder="env:prod"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addTag(); }
              }}
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setDraft(""); }}>Cancel</Button>
              <Button size="sm" onClick={addTag} disabled={setTags.isPending}>Add</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
