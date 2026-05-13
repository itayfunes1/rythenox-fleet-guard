import { useState } from "react";
import { Pencil, Trash2, MessageSquare, Pin, PinOff, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";
import {
  useDeleteMessage,
  useEditMessage,
  useTogglePin,
  useToggleReaction,
  type ChatAttachment,
  type ChatMessage,
  type ChatReaction,
  type TenantMember,
} from "@/hooks/use-chat";
import { MessageAttachments } from "./MessageAttachments";
import { EmojiPickerInline, ReactionStrip } from "./Reactions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface MessageRowProps {
  message: ChatMessage;
  showHeader: boolean;
  isMe: boolean;
  authorEmail: string | undefined;
  reactions: ChatReaction[];
  attachments: ChatAttachment[];
  memberByEmail: Record<string, TenantMember>;
  isAdmin: boolean;
  onOpenThread: (m: ChatMessage) => void;
  showThreadButton?: boolean;
  highlight?: boolean;
}

export function MessageRow({
  message: m,
  showHeader,
  isMe,
  authorEmail,
  reactions,
  attachments,
  memberByEmail,
  isAdmin,
  onOpenThread,
  showThreadButton = true,
  highlight,
}: MessageRowProps) {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const editMut = useEditMessage();
  const deleteMut = useDeleteMessage();
  const pinMut = useTogglePin();
  const toggleReaction = useToggleReaction();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);

  const initials = authorEmail?.substring(0, 2).toUpperCase() || "??";
  const canEdit = isMe && !m.deleted_at;
  const canDelete = (isMe || isAdmin) && !m.deleted_at;
  const isDeleted = !!m.deleted_at;

  const submitEdit = async () => {
    if (!draft.trim()) return;
    try {
      await editMut.mutateAsync({ id: m.id, body: draft, channelId: m.channel_id });
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to edit");
    }
  };

  return (
    <div
      id={`msg-${m.id}`}
      className={cn(
        "group flex gap-3 -mx-3 px-3 py-1 rounded-md transition-colors",
        highlight ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30",
      )}
    >
      <div className="w-8 shrink-0">
        {showHeader && (
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
            {initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold">
              {authorEmail || "Unknown"}
              {isMe && <span className="text-[10px] font-normal text-muted-foreground ml-1">(you)</span>}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
            {m.pinned_at && (
              <span className="text-[10px] text-amber-600 inline-flex items-center gap-0.5">
                <Pin className="h-3 w-3" /> pinned
              </span>
            )}
          </div>
        )}

        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">message deleted</p>
        ) : editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitEdit} disabled={editMut.isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(m.body); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {m.body.split(/(@[\w.+-]+@[\w.-]+\.\w+)/g).map((part, idx) =>
                part.startsWith("@") && memberByEmail[part.slice(1)] ? (
                  <span key={idx} className="bg-primary/10 text-primary rounded px-1 font-medium">{part}</span>
                ) : (
                  <span key={idx}>{part}</span>
                ),
              )}
              {m.edited_at && (
                <span
                  className="ml-1 text-[10px] text-muted-foreground"
                  title={`Edited ${new Date(m.edited_at).toLocaleString()}`}
                >
                  (edited)
                </span>
              )}
            </p>
            <MessageAttachments attachments={attachments} />
            <ReactionStrip messageId={m.id} channelId={m.channel_id} reactions={reactions} />
            {showThreadButton && m.reply_count > 0 && (
              <button
                onClick={() => onOpenThread(m)}
                className="mt-1 text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                {m.reply_count} {m.reply_count === 1 ? "reply" : "replies"}
              </button>
            )}
          </>
        )}
      </div>

      {!isDeleted && !editing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 self-start">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="React">
                <Smile className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <EmojiPickerInline
                onPick={(emoji) => {
                  if (!user || !tenant?.tenantId) return;
                  const mine = reactions.some((r) => r.emoji === emoji && r.user_id === user.id);
                  toggleReaction.mutate({ messageId: m.id, channelId: m.channel_id, emoji, mine });
                }}
              />
            </PopoverContent>
          </Popover>
          {showThreadButton && (
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Reply in thread" onClick={() => onOpenThread(m)}>
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          )}
          {isAdmin && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title={m.pinned_at ? "Unpin" : "Pin"}
              onClick={() => pinMut.mutate({ id: m.id, pinned: !!m.pinned_at, channelId: m.channel_id })}
            >
              {m.pinned_at ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
          )}
          {canEdit && (
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Delete"
              onClick={() => {
                if (confirm("Delete this message?")) {
                  deleteMut.mutate({ id: m.id, channelId: m.channel_id });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
