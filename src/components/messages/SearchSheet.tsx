import { useState } from "react";
import { Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchMessages } from "@/hooks/use-chat";

export function SearchSheet({
  open,
  onOpenChange,
  onJump,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onJump: (channelId: string, messageId: string) => void;
}) {
  const [q, setQ] = useState("");
  const search = useSearchMessages();

  const run = () => {
    if (q.trim().length < 2) return;
    search.mutate({ query: q.trim() });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm">Search messages</SheetTitle>
        </SheetHeader>
        <div className="p-3 border-b border-border flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="Search across your channels and DMs…"
            autoFocus
          />
          <Button onClick={run} disabled={q.trim().length < 2 || search.isPending} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {search.isPending && <p className="text-xs text-muted-foreground p-3">Searching…</p>}
            {search.data && search.data.length === 0 && (
              <p className="text-xs text-muted-foreground p-3">No results.</p>
            )}
            {search.data?.map((r) => (
              <button
                key={r.id}
                onClick={() => { onJump(r.channel_id, r.id); onOpenChange(false); }}
                className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors space-y-1"
              >
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {r.is_dm ? "DM" : `#${r.channel_name}`}
                  </span>
                  <span>·</span>
                  <span>{r.author_email || "Unknown"}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  {r.parent_id && <span className="text-primary">in thread</span>}
                </div>
                <p className="text-sm line-clamp-3">{r.body}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
