import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";

export interface PlaybookStep {
  command: string;
  label?: string;
}

export interface Playbook {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  description: string | null;
  steps: PlaybookStep[];
  created_at: string;
  updated_at: string;
}

export function usePlaybooks() {
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`playbooks_${tenantId}_${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playbooks", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ["playbooks", tenantId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  return useQuery({
    queryKey: ["playbooks", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("playbooks").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        steps: (Array.isArray(p.steps) ? (p.steps as unknown as PlaybookStep[]) : []),
      })) as Playbook[];
    },
  });
}

export function useCreatePlaybook() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; description?: string; steps: PlaybookStep[] }) => {
      if (!user || !tenant?.tenantId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("playbooks")
        .insert({
          tenant_id: tenant.tenantId,
          created_by: user.id,
          name: params.name,
          description: params.description ?? null,
          steps: params.steps as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

export function useUpdatePlaybook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; description?: string | null; steps?: PlaybookStep[] }) => {
      const { id, steps, ...rest } = params;
      const updates: Record<string, any> = { ...rest };
      if (steps) updates.steps = steps as any;
      const { error } = await supabase.from("playbooks").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

export function useDeletePlaybook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playbooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playbooks"] }),
  });
}

/**
 * Bulk-execute one or more commands across one or more devices.
 * Inserts a row in remote_tasks per (target, command) pair and reports progress.
 */
export function useBulkExecute() {
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { targetIds: string[]; commands: string[]; onProgress?: (done: number, total: number) => void }) => {
      if (!tenant?.tenantId) throw new Error("No tenant");
      const tenantId = tenant.tenantId;
      const total = params.targetIds.length * params.commands.length;
      let done = 0;
      const failures: { target: string; command: string; error: string }[] = [];

      for (const target of params.targetIds) {
        for (const command of params.commands) {
          const { error } = await supabase.from("remote_tasks").insert({
            tenant_id: tenantId,
            target_id: target,
            command,
          });
          if (error) failures.push({ target, command, error: error.message });
          done += 1;
          params.onProgress?.(done, total);
        }
      }
      return { total, failures };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["remote_tasks"] }),
  });
}
