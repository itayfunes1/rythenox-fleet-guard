import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChatChannel {
  id: string;
  tenant_id: string;
  name: string | null;
  type: string;
  created_by: string;
  created_at: string;
}

export interface ChatChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  user_email: string;
  joined_at: string;
}

export function useChatChannels(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["chat_channels", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channels" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ChatChannel[];
    },
  });
}

export function useChannelMembers(channelId: string | undefined) {
  return useQuery({
    queryKey: ["channel_members", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channel_members" as any)
        .select("*")
        .eq("channel_id", channelId!);
      if (error) throw error;
      return (data || []) as unknown as ChatChannelMember[];
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenant_id: string;
      name: string | null;
      type: string;
      created_by: string;
      members: { user_id: string; user_email: string }[];
    }) => {
      // Create channel
      const { data: channel, error } = await supabase
        .from("chat_channels" as any)
        .insert({
          tenant_id: params.tenant_id,
          name: params.name,
          type: params.type,
          created_by: params.created_by,
        })
        .select()
        .single();
      if (error) throw error;

      const ch = channel as any;

      // Add members (including creator)
      const memberRows = params.members.map((m) => ({
        channel_id: ch.id,
        user_id: m.user_id,
        user_email: m.user_email,
      }));

      if (memberRows.length > 0) {
        const { error: memError } = await supabase
          .from("chat_channel_members" as any)
          .insert(memberRows);
        if (memError) throw memError;
      }

      return ch as ChatChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_channels"] });
    },
  });
}

export function useAddChannelMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { channel_id: string; user_id: string; user_email: string }) => {
      const { error } = await supabase
        .from("chat_channel_members" as any)
        .insert(params);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["channel_members", vars.channel_id] });
    },
  });
}
