import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Send, MessageSquare, Loader2, Hash, Users, UserPlus, Plus, MessageCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";
import { useTeamChat, useSendMessage, type ChatMessage } from "@/hooks/use-team-chat";
import {
  useChatChannels, useCreateChannel, type ChatChannel,
} from "@/hooks/use-chat-channels";
import { useTenantMembers } from "@/hooks/use-tenant-members";
import { Checkbox } from "@/components/ui/checkbox";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export default function TeamChat() {
  const [input, setInput] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"channel" | "group" | "dm">("group");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: channels, isLoading: channelsLoading } = useChatChannels(tenant?.tenantId);
  const { data: messages, isLoading: messagesLoading } = useTeamChat(selectedChannelId ?? undefined);
  const { data: tenantMembers } = useTenantMembers(tenant?.tenantId);
  const sendMessage = useSendMessage();
  const createChannel = useCreateChannel();

  // Auto-select first channel
  useEffect(() => {
    if (!selectedChannelId && channels && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !tenant?.tenantId || !user || !selectedChannelId) return;
    sendMessage.mutate({
      tenant_id: tenant.tenantId,
      user_id: user.id,
      user_email: user.email || "unknown",
      message: text,
      channel_id: selectedChannelId,
    });
    setInput("");
  };

  const handleCreateChannel = () => {
    if (!tenant?.tenantId || !user) return;
    const name = newChannelType === "dm" ? null : newChannelName.trim();
    if (newChannelType !== "dm" && !name) return;

    const members = [
      { user_id: user.id, user_email: user.email || "unknown" },
      ...selectedMemberIds
        .filter((id) => id !== user.id)
        .map((id) => {
          const m = tenantMembers?.find((tm) => tm.user_id === id);
          return { user_id: id, user_email: (m as any)?.user_email || id.slice(0, 8) };
        }),
    ];

    createChannel.mutate(
      {
        tenant_id: tenant.tenantId,
        name,
        type: newChannelType,
        created_by: user.id,
        members,
      },
      {
        onSuccess: (ch) => {
          setSelectedChannelId(ch.id);
          setShowCreateDialog(false);
          setNewChannelName("");
          setSelectedMemberIds([]);
        },
      }
    );
  };

  const groups = groupMessagesByDate(messages || []);

  const channelsByType = {
    channel: (channels || []).filter((c) => c.type === "channel"),
    group: (channels || []).filter((c) => c.type === "group"),
    dm: (channels || []).filter((c) => c.type === "dm"),
  };

  const channelIcon = (type: string) => {
    if (type === "group") return <Users className="h-3.5 w-3.5" />;
    if (type === "dm") return <MessageCircle className="h-3.5 w-3.5" />;
    return <Hash className="h-3.5 w-3.5" />;
  };

  const otherMembers = (tenantMembers || []).filter((m) => m.user_id !== user?.id);

  return (
    <div className="flex h-[calc(100vh-4rem)] p-4 md:p-6 gap-4">
      {/* Sidebar */}
      <Card className="w-64 shrink-0 glass-card border-border/30 flex flex-col overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Channels
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {channelsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Channels */}
                {channelsByType.channel.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-2 mb-1">
                      Channels
                    </p>
                    {channelsByType.channel.map((ch) => (
                      <ChannelItem
                        key={ch.id}
                        channel={ch}
                        isActive={ch.id === selectedChannelId}
                        icon={channelIcon(ch.type)}
                        onClick={() => setSelectedChannelId(ch.id)}
                      />
                    ))}
                  </div>
                )}
                {/* Groups */}
                {channelsByType.group.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-2 mb-1">
                      Groups
                    </p>
                    {channelsByType.group.map((ch) => (
                      <ChannelItem
                        key={ch.id}
                        channel={ch}
                        isActive={ch.id === selectedChannelId}
                        icon={channelIcon(ch.type)}
                        onClick={() => setSelectedChannelId(ch.id)}
                      />
                    ))}
                  </div>
                )}
                {/* DMs */}
                {channelsByType.dm.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-2 mb-1">
                      Direct Messages
                    </p>
                    {channelsByType.dm.map((ch) => (
                      <ChannelItem
                        key={ch.id}
                        channel={ch}
                        isActive={ch.id === selectedChannelId}
                        icon={channelIcon(ch.type)}
                        onClick={() => setSelectedChannelId(ch.id)}
                      />
                    ))}
                  </div>
                )}
                {(channels || []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No channels yet</p>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex flex-col flex-1 glass-card border-border/30 overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="flex items-center gap-2 text-base">
            {selectedChannelId && channels ? (
              <>
                {channelIcon(channels.find((c) => c.id === selectedChannelId)?.type || "channel")}
                <span>{channels.find((c) => c.id === selectedChannelId)?.name || "Direct Message"}</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 text-primary" />
                Team Chat
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-6">
              {!selectedChannelId ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Select a channel to start chatting
                </div>
              ) : messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                        {group.date}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                    <div className="space-y-3">
                      {group.messages.map((msg) => {
                        const isMe = msg.user_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[hsl(260,67%,60%)] flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                              {msg.user_email.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-xs font-medium text-foreground">
                                  {isMe ? "You" : msg.user_email.split("@")[0]}
                                </span>
                                <span className="text-[10px] text-muted-foreground/50">
                                  {formatTime(msg.created_at)}
                                </span>
                              </div>
                              <div
                                className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                                  isMe
                                    ? "bg-primary/15 text-foreground border border-primary/20"
                                    : "bg-muted/40 text-foreground border border-border/30"
                                }`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border/30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedChannelId ? "Type a message..." : "Select a channel first"}
                className="flex-1 bg-muted/30 border-border/50 focus:border-primary h-10"
                disabled={sendMessage.isPending || !selectedChannelId}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 shadow-lg shadow-primary/20 shrink-0"
                disabled={!input.trim() || sendMessage.isPending || !selectedChannelId}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Create Channel/Group/DM Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {(["channel", "group", "dm"] as const).map((t) => (
                <Button
                  key={t}
                  variant={newChannelType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewChannelType(t)}
                  className="capitalize"
                >
                  {t === "dm" ? "DM" : t}
                </Button>
              ))}
            </div>

            {/* Name */}
            {newChannelType !== "dm" && (
              <Input
                placeholder={newChannelType === "channel" ? "Channel name" : "Group name"}
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            )}

            {/* Member picker */}
            {otherMembers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {newChannelType === "dm" ? "Select member" : "Add members"}
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border/30 rounded-lg p-2">
                  {otherMembers.map((m) => (
                    <label
                      key={m.user_id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(m.user_id)}
                        onCheckedChange={(checked) => {
                          if (newChannelType === "dm") {
                            setSelectedMemberIds(checked ? [m.user_id] : []);
                          } else {
                            setSelectedMemberIds((prev) =>
                              checked ? [...prev, m.user_id] : prev.filter((id) => id !== m.user_id)
                            );
                          }
                        }}
                      />
                      <span className="text-foreground">{m.user_id.slice(0, 8)}...</span>
                      <span className="text-muted-foreground text-xs ml-auto">{m.role}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {otherMembers.length === 0 && (
              <p className="text-sm text-muted-foreground">No other members in your organization yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={
                createChannel.isPending ||
                (newChannelType !== "dm" && !newChannelName.trim()) ||
                (newChannelType === "dm" && selectedMemberIds.length === 0)
              }
            >
              {createChannel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChannelItem({
  channel,
  isActive,
  icon,
  onClick,
}: {
  channel: ChatChannel;
  isActive: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/20"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
    >
      {icon}
      <span className="truncate">{channel.name || "Direct Message"}</span>
    </button>
  );
}
