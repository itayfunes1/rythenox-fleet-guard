import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Lock, Menu, MessageSquarePlus, Plus, Send, Users } from "lucide-react";
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
  useChannelMessages,
  useCreateChannel,
  useMarkChannelRead,
  useMyMemberships,
  useSendMessage,
  useStartDm,
  useTenantMembers,
  useTyping,
  type ChatChannel,
  type TenantMember,
} from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

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

  const send = useSendMessage();
  const createChannel = useCreateChannel();
  const startDm = useStartDm();
  const markRead = useMarkChannelRead();
  const { data: messages = [] } = useChannelMessages(activeChannelId);
  const { activeTypers, ping } = useTyping(activeChannelId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<number>(0);

  const groupChannels = channels.filter((c) => !c.is_dm);
  const directChannels = channels.filter((c) => c.is_dm);

  // Auto-select first channel
  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Mark as read when messages load
  useEffect(() => {
    if (activeChannelId && messages.length > 0) {
      markRead.mutate(activeChannelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId, messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [messages, activeChannelId]);

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

  const handleSend = async () => {
    if (!activeChannelId || !draft.trim()) return;
    const mentionEmails = Array.from(draft.matchAll(/@([\w.+-]+@[\w.-]+\.\w+)/g)).map((m) => m[1]);
    const mentions = mentionEmails
      .map((e) => memberByEmail[e]?.user_id)
      .filter((x): x is string => !!x);
    try {
      await send.mutateAsync({ channelId: activeChannelId, body: draft, mentions });
      setDraft("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    }
  };

  const handleDraftChange = (val: string) => {
    setDraft(val);
    const now = Date.now();
    if (now - typingRef.current > 1500) {
      typingRef.current = now;
      ping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const canCreateChannels = tenant?.canManageOrganization ?? false;
  const otherMembers = members.filter((m) => m.user_id !== user?.id);

  const typerLabels = activeTypers
    .map((t) => memberById[t.user_id]?.email?.split("@")[0])
    .filter(Boolean);

  // Resolve DM display label by finding the "other" member from messages or fallback
  const dmLabelFor = (channel: ChatChannel) => {
    // Find a message in this channel from someone other than me to identify the peer
    // (we don't have membership rows for DMs other than mine, so this is a heuristic)
    const otherAuthor = directChannels.find((c) => c.id === channel.id);
    if (channel.created_by && channel.created_by !== user?.id) {
      const peer = memberById[channel.created_by];
      if (peer) return peer.email;
    }
    return "Direct message";
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Channels header */}
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

        {/* DMs header */}
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
                      No other members in this organization yet. Invite teammates from the Organization settings to start a DM.
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

        {/* Quick "New DM" CTA for discoverability */}
        <div className="px-2 pb-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            onClick={() => setDmOpen(true)}
          >
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
          <Button variant="outline" size="sm" onClick={() => setDmOpen(true)} className="gap-1.5">
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden sm:inline">New DM</span>
          </Button>
        </div>
      </header>

      <Card className="flex md:grid md:grid-cols-12 h-[calc(100vh-12rem)] overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:col-span-3 border-r border-border flex-col min-h-0">
          {SidebarContent}
        </aside>

        {/* Conversation */}
        <section className="flex-1 md:col-span-9 flex flex-col min-h-0">
          <div className="border-b border-border px-3 md:px-5 py-3 flex items-center gap-2">
            {/* Mobile nav trigger */}
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
              </>
            ) : (
              <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Select a conversation</span>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-3">
            {!activeChannel && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 px-4">
                <MessageSquarePlus className="h-8 w-8 opacity-50" />
                <p className="text-sm">Pick a channel or start a direct message.</p>
                <Button size="sm" onClick={() => setDmOpen(true)}>
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  New direct message
                </Button>
              </div>
            )}
            {activeChannel && messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center pt-8">No messages yet — say hi 👋</p>
            )}
            {messages.map((m, i) => {
              const author = memberById[m.author_id];
              const initials = author?.email?.substring(0, 2).toUpperCase() || "??";
              const prev = messages[i - 1];
              const showHeader = !prev || prev.author_id !== m.author_id || (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000);
              const isMe = m.author_id === user?.id;
              return (
                <div key={m.id} className="group flex gap-3">
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
                        <span className="text-sm font-semibold">{author?.email || "Unknown"}{isMe && <span className="text-[10px] font-normal text-muted-foreground ml-1">(you)</span>}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {m.body.split(/(@[\w.+-]+@[\w.-]+\.\w+)/g).map((part, idx) =>
                        part.startsWith("@") && memberByEmail[part.slice(1)] ? (
                          <span key={idx} className="bg-primary/10 text-primary rounded px-1 font-medium">{part}</span>
                        ) : (
                          <span key={idx}>{part}</span>
                        ),
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border px-3 md:px-5 py-3 space-y-1">
            <div className="h-4 text-[11px] text-muted-foreground italic">
              {typerLabels.length === 1 && `${typerLabels[0]} is typing…`}
              {typerLabels.length === 2 && `${typerLabels[0]} and ${typerLabels[1]} are typing…`}
              {typerLabels.length > 2 && `${typerLabels.length} people are typing…`}
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeChannel ? `Message ${activeChannel.is_dm ? "" : "#" + activeChannel.name}` : "Select a channel first"}
                disabled={!activeChannel}
                rows={2}
                className="resize-none"
              />
              <Button onClick={handleSend} disabled={!activeChannel || !draft.trim() || send.isPending} size="icon" className="h-10 w-10 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </Card>
    </div>
  );
}
