import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";
import { useTeamChat, useSendMessage, type ChatMessage } from "@/hooks/use-team-chat";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data: messages, isLoading } = useTeamChat(tenant?.tenantId);
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !tenant?.tenantId || !user) return;
    sendMessage.mutate({
      tenant_id: tenant.tenantId,
      user_id: user.id,
      user_email: user.email || "unknown",
      message: text,
    });
    setInput("");
  };

  const groups = groupMessagesByDate(messages || []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6">
      <Card className="flex flex-col flex-1 glass-card border-border/30 overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Team Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-6">
              {isLoading ? (
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
                placeholder="Type a message..."
                className="flex-1 bg-muted/30 border-border/50 focus:border-primary h-10"
                disabled={sendMessage.isPending}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 bg-gradient-to-r from-primary to-[hsl(260,67%,60%)] hover:opacity-90 shadow-lg shadow-primary/20 shrink-0"
                disabled={!input.trim() || sendMessage.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
