import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";

export interface ScheduledTask {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  command: string;
  target_ids: string[];
  cron_expression: string;
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useScheduledTasks() {
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`scheduled_tasks_${tenantId}_${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_tasks", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ["scheduled_tasks", tenantId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  return useQuery({
    queryKey: ["scheduled_tasks", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScheduledTask[];
    },
  });
}

export function useCreateScheduledTask() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      command: string;
      target_ids: string[];
      cron_expression: string;
      enabled?: boolean;
    }) => {
      if (!user || !tenant?.tenantId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("scheduled_tasks")
        .insert({
          tenant_id: tenant.tenantId,
          created_by: user.id,
          name: params.name,
          command: params.command,
          target_ids: params.target_ids,
          cron_expression: params.cron_expression,
          enabled: params.enabled ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled_tasks"] }),
  });
}

export function useUpdateScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: Partial<ScheduledTask> & { id: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("scheduled_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled_tasks"] }),
  });
}

export function useDeleteScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled_tasks"] }),
  });
}
