import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RemoteTask {
  id: string;
  tenant_id: string;
  target_id: string;
  command: string;
  status: "Pending" | "Sent" | "Completed" | "Failed";
  result: string | null;
  created_at: string;
}

export function useTasks(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["remote_tasks", tenantId],
    enabled: !!tenantId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("remote_tasks" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as RemoteTask[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tenant_id: string; target_id: string; command: string }) => {
      const { data, error } = await supabase
        .from("remote_tasks" as any)
        .insert({
          tenant_id: params.tenant_id,
          target_id: params.target_id,
          command: params.command,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remote_tasks"] });
    },
  });
}
