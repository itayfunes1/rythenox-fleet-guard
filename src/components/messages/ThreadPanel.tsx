import { useMemo, useRef, useState } from "react";
import { Send, X, Paperclip } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/AuthProvider";
import {
  useChannelAttachments,
  useChannelReactions,
  useSendMessage,
  useThreadReplies,
  type ChatMessage,
  type TenantMember,
} from "@/hooks/use-chat";
import { MessageRow } from "./MessageRow";
import { toast } from "sonner";

export function ThreadPanel({
  parent,
  onClose,
  members,
  isAdmin,
}: {
  parent: ChatMessage | null;
  onClose: () => void;
  members: TenantMember[];
  isAdmin: boolean;
}) {
  const { user } = useAuth();
  const send = useSendMessage();
  const { data: replies = [] } = useThreadReplies(parent?.id ?? null);
  const { data: reactions = [] } = useChannelReactions(parent?.channel_id ?? null);
  const { data: attachments = [] } = useChannelAttachments(parent?.channel_id ?? null);

  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const memberByEmail = useMemo(() => {
    const m: Record<string, TenantMember> = {};
    members.forEach((mem) => { m[mem.email] = mem; });
    return m;
  }, [members]);

  const memberById = useMemo(() => {
    const m: Record<string, TenantMember> = {};
    members.forEach((mem) => { m[mem.user_id] = mem; });
    return m;
  }, [members]);

  const reactionsByMessage = useMemo(() => {
    const m: Record<string, typeof reactions> = {};
    reactions.forEach((r) => { (m[r.message_id] ||= []).push(r); });
    return m;
  }, [reactions]);

  const attachmentsByMessage = useMemo(() => {
    const m: Record<string, typeof attachments> = {};
    attachments.forEach((a) => { (m[a.message_id] ||= []).push(a); });
    return m;
  }, [attachments]);

  const handleSend = async () => {
    if (!parent) return;
    if (!draft.trim() && files.length === 0) return;
    const mentionEmails = Array.from(draft.matchAll(/@([\w.+-]+@[\w.-]+\.\w+)/g)).map((m) => m[1]);
    const mentions = mentionEmails.map((e) => memberByEmail[e]?.user_id).filter((x): x is string => !!x);
    try {
      await send.mutateAsync({
        channelId: parent.channel_id,
        body: draft,
        mentions,
        parentId: parent.id,
        files,
      });
      setDraft("");
      setFiles([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    }
  };

  return (
    <Sheet open={!!parent} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm">Thread</SheetTitle>
        </SheetHeader>
        {parent && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-3 py-3 space-y-3">
              <MessageRow
                message={parent}
                showHeader
                isMe={parent.author_id === user?.id}
                authorEmail={memberById[parent.author_id]?.email}
                reactions={reactionsByMessage[parent.id] || []}
                attachments={attachmentsByMessage[parent.id] || []}
                memberByEmail={memberByEmail}
                isAdmin={isAdmin}
                onOpenThread={() => {}}
                showThreadButton={false}
              />
              <div className="border-t border-border pt-3 space-y-3">
                {replies.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">No replies yet.</p>
                )}
                {replies.map((r, i) => {
                  const prev = replies[i - 1];
                  const showHeader = !prev || prev.author_id !== r.author_id ||
                    (new Date(r.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000);
                  return (
                    <MessageRow
                      key={r.id}
                      message={r}
                      showHeader={showHeader}
                      isMe={r.author_id === user?.id}
                      authorEmail={memberById[r.author_id]?.email}
                      reactions={reactionsByMessage[r.id] || []}
                      attachments={attachmentsByMessage[r.id] || []}
                      memberByEmail={memberByEmail}
                      isAdmin={isAdmin}
                      onOpenThread={() => {}}
                      showThreadButton={false}
                    />
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
        <div className="border-t border-border p-3 space-y-2">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {files.map((f, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-1 rounded inline-flex items-center gap-1">
                  {f.name}
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const f = Array.from(e.target.files || []).slice(0, 5);
              setFiles((prev) => [...prev, ...f].slice(0, 5));
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => fileRef.current?.click()} title="Attach">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Reply…"
              rows={2}
              className="resize-none"
            />
            <Button size="icon" className="h-10 w-10" onClick={handleSend} disabled={send.isPending || (!draft.trim() && files.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
