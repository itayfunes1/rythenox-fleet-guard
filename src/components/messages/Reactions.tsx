import { useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToggleReaction, type ChatReaction } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

export function ReactionStrip({
  messageId,
  channelId,
  reactions,
}: {
  messageId: string;
  channelId: string;
  reactions: ChatReaction[];
}) {
  const { user } = useAuth();
  const toggle = useToggleReaction();

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const cur = map.get(r.emoji) || { count: 0, mine: false };
      cur.count += 1;
      if (r.user_id === user?.id) cur.mine = true;
      map.set(r.emoji, cur);
    }
    return Array.from(map.entries());
  }, [reactions, user?.id]);

  if (grouped.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {grouped.map(([emoji, info]) => (
        <button
          key={emoji}
          onClick={() => toggle.mutate({ messageId, channelId, emoji, mine: info.mine })}
          className={cn(
            "inline-flex items-center gap-1 h-6 px-2 rounded-full border text-xs transition-colors",
            info.mine
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-muted/40 border-border hover:bg-muted",
          )}
        >
          <span>{emoji}</span>
          <span className="tabular-nums">{info.count}</span>
        </button>
      ))}
    </div>
  );
}

export const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀", "👀", "🙏", "✅"];

export function EmojiPickerInline({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="flex gap-0.5 p-1 bg-popover border border-border rounded-md shadow-sm">
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-base"
          type="button"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
