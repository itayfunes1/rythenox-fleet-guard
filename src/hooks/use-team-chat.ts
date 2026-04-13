import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  message: string;
  channel_id: string | null;
  created_at: string;
}

export function useTeamChat(channelId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`chat_channel_${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chat_messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          queryClient.setQueryData<ChatMessage[]>(["team_chat", channelId], (old) => {
            if (!old) return [payload.new as ChatMessage];
            // Deduplicate by id
            if (old.some((m) => m.id === (payload.new as any).id)) return old;
            return [...old, payload.new as ChatMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return useQuery({
    queryKey: ["team_chat", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_chat_messages")
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
  return useMutation({
    mutationFn: async (params: {
      tenant_id: string;
      user_id: string;
      user_email: string;
      message: string;
      channel_id: string;
    }) => {
      const { data, error } = await supabase
        .from("team_chat_messages")
        .insert({
          tenant_id: params.tenant_id,
          user_id: params.user_id,
          user_email: params.user_email,
          message: params.message,
          channel_id: params.channel_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}
