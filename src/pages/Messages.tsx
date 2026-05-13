import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Lock, Menu, MessageSquarePlus, Paperclip, Plus, Search, Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";
import {
  useChannels,
  useChannelAttachments,
  useChannelMessages,
  useChannelReactions,
  useCreateChannel,
  useMarkChannelRead,
  useMyMemberships,
  useSendMessage,
  useStartDm,
  useTenantMembers,
  useTyping,
  type ChatChannel,
  type ChatMessage,
  type TenantMember,
} from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { MessageRow } from "@/components/messages/MessageRow";
import { ThreadPanel } from "@/components/messages/ThreadPanel";
import { SearchSheet } from "@/components/messages/SearchSheet";
import { PinnedPopover } from "@/components/messages/PinnedPopover";

const MAX_FILES = 5;
const MAX_BYTES = 25 * 1024 * 1024;

export default function Messages() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: channels = [], isLoading: loadingChannels } = useChannels();
  const { data: memberships = [] } = useMyMemberships();
  const { data: members = [] } = useTenantMembers();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const send = useSendMessage();
  const createChannel = useCreateChannel();
  const startDm = useStartDm();
  const markRead = useMarkChannelRead();
  const { data: messages = [] } = useChannelMessages(activeChannelId);
  const { data: reactions = [] } = useChannelReactions(activeChannelId);
  const { data: attachments = [] } = useChannelAttachments(activeChannelId);
  const { activeTypers, ping } = useTyping(activeChannelId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<number>(0);

  const groupChannels = channels.filter((c) => !c.is_dm);
  const directChannels = channels.filter((c) => c.is_dm);

  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (activeChannelId && messages.length > 0) {
      markRead.mutate(activeChannelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId, messages.length]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, activeChannelId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);

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

  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.parent_id),
    [messages],
  );

  const isAdmin = tenant?.canManageOrganization ?? false;

  const handleAddFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    const tooBig = arr.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      toast.error(`${tooBig.name} exceeds 25 MB`);
      return;
    }
    setFiles((prev) => [...prev, ...arr].slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!activeChannelId) return;
    if (!draft.trim() && files.length === 0) return;
    const mentionEmails = Array.from(draft.matchAll(/@([\w.+-]+@[\w.-]+\.\w+)/g)).map((m) => m[1]);
    const mentions = mentionEmails
      .map((e) => memberByEmail[e]?.user_id)
      .filter((x): x is string => !!x);
    try {
      await send.mutateAsync({ channelId: activeChannelId, body: draft, mentions, files });
      setDraft("");
      setFiles([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    }
  };

  const updateMentionState = (val: string, caret: number) => {
    const upTo = val.slice(0, caret);
    const m = upTo.match(/(?:^|\s)@([\w.-]*)$/);
    setMentionQuery(m ? m[1] : null);
    setMentionIndex(0);
  };

  const handleDraftChange = (val: string) => {
    setDraft(val);
    const caret = textareaRef.current?.selectionStart ?? val.length;
    updateMentionState(val, caret);
    const now = Date.now();
    if (now - typingRef.current > 1500) {
      typingRef.current = now;
      ping();
    }
  };

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => m.user_id !== user?.id && m.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, members, user?.id]);

  const insertMention = (email: string) => {
    const ta = textareaRef.current;
    const caret = ta?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret);
    const after = draft.slice(caret);
    const replaced = before.replace(/@([\w.-]*)$/, `@${email} `);
    const next = replaced + after;
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = replaced.length;
      ta?.focus();
      ta?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionMatches.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionMatches[mentionIndex].email);
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreate = async () => {
    try {
      const id = await createChannel.mutateAsync({ name: newName, description: newDesc });
      setActiveChannelId(id);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      toast.success("Channel created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create channel");
    }
  };

  const handleStartDm = async (userId: string) => {
    try {
      const id = await startDm.mutateAsync(userId);
      setActiveChannelId(id);
      setDmOpen(false);
      setMobileNavOpen(false);
      toast.success("DM ready");
    } catch (e: any) {
      toast.error(e.message || "Failed to start DM");
    }
  };

  const jumpToMessage = (channelId: string, messageId: string) => {
    setActiveChannelId(channelId);
    setHighlightId(messageId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    setTimeout(() => setHighlightId(null), 2500);
  };

  const canCreateChannels = tenant?.canManageOrganization ?? false;
  const otherMembers = members.filter((m) => m.user_id !== user?.id);

  const typerLabels = activeTypers
    .map((t) => memberById[t.user_id]?.email?.split("@")[0])
    .filter(Boolean);

  const dmLabelFor = (channel: ChatChannel) => {
    const otherMembership = memberships.find(
      (m) => m.channel_id === channel.id && m.user_id !== user?.id,
    );
    const peer = otherMembership ? memberById[otherMembership.user_id] : undefined;
    if (peer?.email) return peer.email;
    if (channel.created_by && channel.created_by !== user?.id) {
      const creator = memberById[channel.created_by];
      if (creator?.email) return creator.email;
    }
    return "Direct message";
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Channels</span>
          {canCreateChannels && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="h-3.5 w-3.5" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create channel</DialogTitle>
                  <DialogDescription>All organization members will be added automatically.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="channel-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Textarea placeholder="What is this channel for? (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createChannel.isPending || newName.trim().length < 2}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {loadingChannels && <p className="text-xs text-muted-foreground px-2 py-1">Loading…</p>}
          {!loadingChannels && groupChannels.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">
              {canCreateChannels ? "No channels yet — create one." : "No channels yet."}
            </p>
          )}
          {groupChannels.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveChannelId(c.id); setMobileNavOpen(false); }}
              className={cn(
                "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                activeChannelId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
              )}
            >
              <Hash className="h-3.5 w-3.5 opacity-70" />
              <span className="truncate flex-1">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Direct Messages</span>
          <Dialog open={dmOpen} onOpenChange={setDmOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Start a direct message"><MessageSquarePlus className="h-3.5 w-3.5" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a direct message</DialogTitle>
                <DialogDescription>Pick someone from your organization to message privately.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-80">
                <div className="space-y-1">
                  {otherMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1 py-2">
                      No other members in this organization yet.
                    </p>
                  )}
                  {otherMembers.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => handleStartDm(m.user_id)}
                      disabled={startDm.isPending}
                      className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted text-sm disabled:opacity-50"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {m.email.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 truncate">{m.email}</span>
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <div className="px-2 pb-1">
          <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => setDmOpen(true)}>
            <MessageSquarePlus className="h-3.5 w-3.5 mr-2" />
            New direct message
          </Button>
        </div>

        <div className="p-2 space-y-0.5">
          {directChannels.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">No DMs yet.</p>
          )}
          {directChannels.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveChannelId(c.id); setMobileNavOpen(false); }}
              className={cn(
                "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                activeChannelId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
              )}
            >
              <Lock className="h-3.5 w-3.5 opacity-70" />
              <span className="truncate flex-1">{dmLabelFor(c)}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-semibold tracking-tight">Team Messages</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Channels and direct messages for your organization.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)} className="gap-1.5">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDmOpen(true)} className="gap-1.5">
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden sm:inline">New DM</span>
          </Button>
        </div>
      </header>

      <Card className="flex md:grid md:grid-cols-12 h-[calc(100vh-12rem)] overflow-hidden">
        <aside className="hidden md:flex md:col-span-3 border-r border-border flex-col min-h-0">
          {SidebarContent}
        </aside>

        <section className="flex-1 md:col-span-9 flex flex-col min-h-0">
          <div className="border-b border-border px-3 md:px-5 py-3 flex items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                {SidebarContent}
              </SheetContent>
            </Sheet>

            {activeChannel ? (
              <>
                {activeChannel.is_dm ? <Lock className="h-4 w-4 text-muted-foreground shrink-0" /> : <Hash className="h-4 w-4 text-muted-foreground shrink-0" />}
                <h2 className="text-sm font-semibold truncate">{activeChannel.is_dm ? dmLabelFor(activeChannel) : activeChannel.name}</h2>
                {activeChannel.description && <span className="text-xs text-muted-foreground border-l border-border pl-2 ml-1 hidden md:inline truncate">{activeChannel.description}</span>}
                <div className="ml-auto flex items-center gap-1">
                  <PinnedPopover
                    channelId={activeChannel.id}
                    members={members}
                    onJump={(id) => jumpToMessage(activeChannel.id, id)}
                  />
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Select a conversation</span>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-1">
            {!activeChannel && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 px-4">
                <MessageSquarePlus className="h-8 w-8 opacity-50" />
                <p className="text-sm">Pick a channel or start a direct message.</p>
              </div>
            )}
            {activeChannel && visibleMessages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center pt-8">No messages yet — say hi 👋</p>
            )}
            {visibleMessages.map((m, i) => {
              const author = memberById[m.author_id];
              const prev = visibleMessages[i - 1];
              const showHeader = !prev || prev.author_id !== m.author_id ||
                (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000);
              return (
                <MessageRow
                  key={m.id}
                  message={m}
                  showHeader={showHeader}
                  isMe={m.author_id === user?.id}
                  authorEmail={author?.email}
                  reactions={reactionsByMessage[m.id] || []}
                  attachments={attachmentsByMessage[m.id] || []}
                  memberByEmail={memberByEmail}
                  isAdmin={isAdmin}
                  onOpenThread={setThreadParent}
                  highlight={highlightId === m.id}
                />
              );
            })}
          </div>

          <div className="border-t border-border px-3 md:px-5 py-3 space-y-2 relative">
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute bottom-full left-3 md:left-5 right-14 md:right-16 mb-1 z-20 bg-popover border border-border rounded-lg shadow-md overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                  Mention a teammate
                </div>
                {mentionMatches.map((m, i) => (
                  <button
                    key={m.user_id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); insertMention(m.email); }}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      i === mentionIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {m.email.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{m.email}</span>
                  </button>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {files.map((f, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-1 rounded inline-flex items-center gap-1.5">
                    <Paperclip className="h-3 w-3" />
                    {f.name}
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="h-4 text-[11px] text-muted-foreground italic">
              {typerLabels.length === 1 && `${typerLabels[0]} is typing…`}
              {typerLabels.length === 2 && `${typerLabels[0]} and ${typerLabels[1]} are typing…`}
              {typerLabels.length > 2 && `${typerLabels.length} people are typing…`}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />

            <div className="flex gap-2 items-end">
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={!activeChannel || files.length >= MAX_FILES}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setMentionQuery(null), 100)}
                placeholder={activeChannel ? `Message ${activeChannel.is_dm ? "" : "#" + activeChannel.name}` : "Select a channel first"}
                disabled={!activeChannel}
                rows={2}
                className="resize-none"
              />
              <Button onClick={handleSend} disabled={!activeChannel || (!draft.trim() && files.length === 0) || send.isPending} size="icon" className="h-10 w-10 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </Card>

      <ThreadPanel
        parent={threadParent}
        onClose={() => setThreadParent(null)}
        members={members}
        isAdmin={isAdmin}
      />

      <SearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onJump={jumpToMessage}
      />
    </div>
  );
}
