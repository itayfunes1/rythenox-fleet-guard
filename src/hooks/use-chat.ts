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
        .eq("user_id", user!.id);
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
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, body, mentions }: { channelId: string; body: string; mentions: string[] }) => {
      if (!user || !tenant?.tenantId) throw new Error("Not signed in");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Empty message");
      const { error } = await supabase.from("chat_messages" as any).insert({
        channel_id: channelId,
        tenant_id: tenant.tenantId,
        author_id: user.id,
        body: trimmed,
        mentions,
      } as any);
      if (error) throw error;
      // clear typing
      await supabase.from("chat_typing" as any).delete().eq("channel_id", channelId).eq("user_id", user.id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", vars.channelId] });
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
