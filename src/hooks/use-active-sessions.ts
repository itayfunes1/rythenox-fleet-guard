import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveSession {
  id: string;
  tenant_id: string;
  user_id: string;
  target_id: string;
  created_at: string;
}

export function useActiveSessions(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("active_sessions_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_sessions", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active_sessions", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ["active_sessions", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("active_sessions")
        .select("*")
        .eq("tenant_id", tenantId!);

      if (error) throw error;
      return (data || []) as unknown as ActiveSession[];
    },
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tenant_id: string; user_id: string; target_id: string }) => {
      const { data, error } = await supabase
        .from("active_sessions")
        .insert({
          tenant_id: params.tenant_id,
          user_id: params.user_id,
          target_id: params.target_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active_sessions"] });
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("active_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active_sessions"] });
    },
  });
}
