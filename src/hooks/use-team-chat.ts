import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  message: string;
  created_at: string;
}

export function useTeamChat(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("team_chat_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chat_messages", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          queryClient.setQueryData<ChatMessage[]>(["team_chat", tenantId], (old) => {
            if (!old) return [payload.new as ChatMessage];
            return [...old, payload.new as ChatMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ["team_chat", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_chat_messages")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []) as ChatMessage[];
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tenant_id: string; user_id: string; user_email: string; message: string }) => {
      const { data, error } = await supabase
        .from("team_chat_messages")
        .insert({
          tenant_id: params.tenant_id,
          user_id: params.user_id,
          user_email: params.user_email,
          message: params.message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_chat"] });
    },
  });
}
