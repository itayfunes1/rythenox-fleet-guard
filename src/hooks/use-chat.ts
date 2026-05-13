import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";

export interface ChatChannel {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_dm: boolean;
  created_by: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  tenant_id: string;
  author_id: string;
  body: string;
  mentions: string[];
  edited_at: string | null;
  created_at: string;
  parent_id: string | null;
  reply_count: number;
  deleted_at: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
}

export interface ChatMembership {
  id: string;
  channel_id: string;
  user_id: string;
  last_read_at: string;
}

export interface TenantMember {
  user_id: string;
  email: string;
  role: string;
}

export interface TypingRow {
  channel_id: string;
  user_id: string;
  updated_at: string;
}

export interface ChatReaction {
  id: string;
  message_id: string;
  channel_id: string;
  user_id: string;
  emoji: string;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  channel_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  uploader_id: string;
}

const TYPING_WINDOW_MS = 4000;

export function useTenantMembers() {
  const { data: tenant } = useTenant();
  return useQuery({
    queryKey: ["tenant_members_list", tenant?.tenantId],
    enabled: !!tenant?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_tenant_members" as any);
      if (error) throw error;
      return (data || []) as TenantMember[];
    },
  });
}

export function useChannels() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat_channels_realtime_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_channels" }, () => {
        qc.invalidateQueries({ queryKey: ["chat_channels", tenant?.tenantId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_channel_members", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat_channels", tenant?.tenantId] });
        qc.invalidateQueries({ queryKey: ["chat_memberships", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, tenant?.tenantId, qc]);

  return useQuery({
    queryKey: ["chat_channels", tenant?.tenantId],
    enabled: !!user && !!tenant?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channels" as any)
        .select("*")
        .order("is_dm", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ChatChannel[];
    },
  });
}

export function useMyMemberships() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat_memberships_realtime_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_channel_members", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat_memberships", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["chat_memberships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channel_members" as any)
        .select("*")
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ChatMembership[];
    },
  });
}

export function useChannelMessages(channelId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`chat_messages_${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat_messages", channelId] });
        qc.invalidateQueries({ queryKey: ["chat_pinned", channelId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_message_reactions", filter: `channel_id=eq.${channelId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat_reactions", channelId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_message_attachments", filter: `channel_id=eq.${channelId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat_attachments", channelId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, qc]);

  return useQuery({
    queryKey: ["chat_messages", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages" as any)
        .select("*")
        .eq("channel_id", channelId!)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
  });
}

export function useChannelReactions(channelId: string | null) {
  return useQuery({
    queryKey: ["chat_reactions", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_message_reactions" as any)
        .select("*")
        .eq("channel_id", channelId!);
      if (error) throw error;
      return (data || []) as unknown as ChatReaction[];
    },
  });
}

export function useChannelAttachments(channelId: string | null) {
  return useQuery({
    queryKey: ["chat_attachments", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_message_attachments" as any)
        .select("*")
        .eq("channel_id", channelId!);
      if (error) throw error;
      return (data || []) as unknown as ChatAttachment[];
    },
  });
}

export function usePinnedMessages(channelId: string | null) {
  return useQuery({
    queryKey: ["chat_pinned", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages" as any)
        .select("*")
        .eq("channel_id", channelId!)
        .not("pinned_at", "is", null)
        .is("deleted_at", null)
        .order("pinned_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
  });
}

export function useThreadReplies(parentId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!parentId) return;
    const ch = supabase
      .channel(`chat_thread_${parentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `parent_id=eq.${parentId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat_thread", parentId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [parentId, qc]);

  return useQuery({
    queryKey: ["chat_thread", parentId],
    enabled: !!parentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages" as any)
        .select("*")
        .eq("parent_id", parentId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
  });
}

async function uploadAttachments(opts: {
  files: File[];
  tenantId: string;
  channelId: string;
  messageId: string;
  uploaderId: string;
}) {
  const rows: any[] = [];
  for (const file of opts.files) {
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${opts.tenantId}/${opts.channelId}/${opts.messageId}/${Date.now()}_${safeName}`;
    const up = await supabase.storage.from("chat-attachments").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) throw up.error;
    rows.push({
      message_id: opts.messageId,
      channel_id: opts.channelId,
      tenant_id: opts.tenantId,
      uploader_id: opts.uploaderId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      byte_size: file.size,
    });
  }
  if (rows.length) {
    const { error } = await supabase.from("chat_message_attachments" as any).insert(rows as any);
    if (error) throw error;
  }
}

export function useSendMessage() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      body,
      mentions,
      parentId,
      files,
    }: {
      channelId: string;
      body: string;
      mentions: string[];
      parentId?: string | null;
      files?: File[];
    }) => {
      if (!user || !tenant?.tenantId) throw new Error("Not signed in");
      const trimmed = body.trim();
      const hasFiles = files && files.length > 0;
      if (!trimmed && !hasFiles) throw new Error("Empty message");

      const { data, error } = await supabase
        .from("chat_messages" as any)
        .insert({
          channel_id: channelId,
          tenant_id: tenant.tenantId,
          author_id: user.id,
          body: trimmed || (hasFiles ? "" : ""),
          mentions,
          parent_id: parentId ?? null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      const messageId = (data as any).id as string;

      if (hasFiles) {
        await uploadAttachments({
          files: files!,
          tenantId: tenant.tenantId,
          channelId,
          messageId,
          uploaderId: user.id,
        });
      }

      await supabase.from("chat_typing" as any).delete().eq("channel_id", channelId).eq("user_id", user.id);
      return messageId;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", vars.channelId] });
      if (vars.parentId) qc.invalidateQueries({ queryKey: ["chat_thread", vars.parentId] });
      qc.invalidateQueries({ queryKey: ["chat_attachments", vars.channelId] });
    },
  });
}

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, channelId }: { id: string; body: string; channelId: string }) => {
      const { error } = await supabase
        .from("chat_messages" as any)
        .update({ body: body.trim() } as any)
        .eq("id", id);
      if (error) throw error;
      return channelId;
    },
    onSuccess: (channelId) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", channelId] });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, channelId }: { id: string; channelId: string }) => {
      const { error } = await supabase
        .from("chat_messages" as any)
        .update({ deleted_at: new Date().toISOString(), body: "" } as any)
        .eq("id", id);
      if (error) throw error;
      return channelId;
    },
    onSuccess: (channelId) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", channelId] });
      qc.invalidateQueries({ queryKey: ["chat_pinned", channelId] });
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned, channelId }: { id: string; pinned: boolean; channelId: string }) => {
      const fn = pinned ? "unpin_chat_message" : "pin_chat_message";
      const { error } = await supabase.rpc(fn as any, { _message_id: id });
      if (error) throw error;
      return channelId;
    },
    onSuccess: (channelId) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", channelId] });
      qc.invalidateQueries({ queryKey: ["chat_pinned", channelId] });
    },
  });
}

export function useToggleReaction() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
      emoji,
      mine,
    }: {
      messageId: string;
      channelId: string;
      emoji: string;
      mine: boolean;
    }) => {
      if (!user || !tenant?.tenantId) throw new Error("Not signed in");
      if (mine) {
        const { error } = await supabase
          .from("chat_message_reactions" as any)
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chat_message_reactions" as any)
          .insert({
            message_id: messageId,
            channel_id: channelId,
            tenant_id: tenant.tenantId,
            user_id: user.id,
            emoji,
          } as any);
        if (error) throw error;
      }
      return channelId;
    },
    onSuccess: (channelId) => {
      qc.invalidateQueries({ queryKey: ["chat_reactions", channelId] });
    },
  });
}

export function useSearchMessages() {
  return useMutation({
    mutationFn: async ({ query, channelId }: { query: string; channelId?: string | null }) => {
      const { data, error } = await supabase.rpc("search_chat_messages" as any, {
        _query: query,
        _channel_id: channelId ?? null,
        _limit: 50,
      });
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        channel_id: string;
        channel_name: string;
        is_dm: boolean;
        author_id: string;
        author_email: string;
        body: string;
        parent_id: string | null;
        created_at: string;
      }>;
    },
  });
}

export function useMarkChannelRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      if (!user) return;
      await supabase
        .from("chat_channel_members" as any)
        .update({ last_read_at: new Date().toISOString() } as any)
        .eq("channel_id", channelId)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_memberships", user?.id] });
    },
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase.rpc("create_team_channel" as any, {
        _name: name,
        _description: description ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_channels"] });
      qc.invalidateQueries({ queryKey: ["chat_memberships"] });
    },
  });
}

export function useStartDm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc("get_or_create_dm_channel" as any, { _other_user: otherUserId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_channels"] });
    },
  });
}

export function useTyping(channelId: string | null) {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`chat_typing_${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_typing", filter: `channel_id=eq.${channelId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat_typing", channelId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, qc]);

  const query = useQuery({
    queryKey: ["chat_typing", channelId],
    enabled: !!channelId,
    refetchInterval: 3000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_typing" as any)
        .select("*")
        .eq("channel_id", channelId!);
      if (error) throw error;
      return (data || []) as unknown as TypingRow[];
    },
  });

  const ping = async () => {
    if (!channelId || !user || !tenant?.tenantId) return;
    await supabase.from("chat_typing" as any).upsert(
      {
        channel_id: channelId,
        user_id: user.id,
        tenant_id: tenant.tenantId,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "channel_id,user_id" } as any,
    );
  };

  const activeTypers = useMemo(() => {
    const now = Date.now();
    return (query.data || []).filter(
      (t) => t.user_id !== user?.id && now - new Date(t.updated_at).getTime() < TYPING_WINDOW_MS,
    );
  }, [query.data, user?.id]);

  return { activeTypers, ping };
}

// Signed URL helper with React Query caching
export function useSignedAttachmentUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["chat_signed_url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
