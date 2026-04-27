import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";

export interface SavedCommand {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  description: string | null;
  command: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export function useSavedCommands() {
  const { data: tenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = tenant?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`saved_commands_${tenantId}_${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saved_commands", filter: `tenant_id=eq.${tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ["saved_commands", tenantId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ["saved_commands", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_commands")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SavedCommand[];
    },
  });
}

export function useCreateSavedCommand() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; description?: string; command: string; category?: string }) => {
      if (!user || !tenant?.tenantId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("saved_commands")
        .insert({
          tenant_id: tenant.tenantId,
          created_by: user.id,
          name: params.name,
          description: params.description ?? null,
          command: params.command,
          category: params.category ?? "general",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_commands"] }),
  });
}

export function useUpdateSavedCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; description?: string | null; command?: string; category?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("saved_commands").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_commands"] }),
  });
}

export function useDeleteSavedCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_commands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_commands"] }),
  });
}
