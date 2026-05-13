import { Pin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePinnedMessages, type TenantMember } from "@/hooks/use-chat";

export function PinnedPopover({
  channelId,
  members,
  onJump,
}: {
  channelId: string;
  members: TenantMember[];
  onJump: (messageId: string) => void;
}) {
  const { data: pinned = [] } = usePinnedMessages(channelId);
  const memberById: Record<string, TenantMember> = {};
  members.forEach((m) => { memberById[m.user_id] = m; });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
          <Pin className="h-3.5 w-3.5" />
          Pinned {pinned.length > 0 && <span className="text-primary">({pinned.length})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-3 py-2 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pinned messages
        </div>
        <ScrollArea className="max-h-80">
          {pinned.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">Nothing pinned yet.</p>
          ) : (
            <div className="p-1">
              {pinned.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onJump(m.id)}
                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors space-y-0.5"
                >
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {memberById[m.author_id]?.email || "Unknown"}
                    </span>
                    <span>·</span>
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs line-clamp-2">{m.body || "(attachment)"}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
