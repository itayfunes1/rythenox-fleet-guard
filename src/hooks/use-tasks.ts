import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("remote_tasks_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "remote_tasks", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["remote_tasks", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["device_tasks"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "remote_tasks",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if ((payload.new as any).result) {
            queryClient.invalidateQueries({ queryKey: ["remote_tasks", tenantId] });
            queryClient.invalidateQueries({ queryKey: ["device_tasks"] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ["remote_tasks", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("remote_tasks")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as RemoteTask[];
    },
  });
}

export function useDeviceTasks(tenantId: string | undefined, targetId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId || !targetId) return;

    const channel = supabase
      .channel(`device_tasks_${targetId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "remote_tasks", filter: `target_id=eq.${targetId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["device_tasks", tenantId, targetId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "remote_tasks", filter: `target_id=eq.${targetId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["device_tasks", tenantId, targetId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, targetId, queryClient]);

  return useQuery({
    queryKey: ["device_tasks", tenantId, targetId],
    enabled: !!tenantId && !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("remote_tasks")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("target_id", targetId!)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as RemoteTask[];
    },
  });
}

export const useTaskExecution = () => {
  const sendCommand = async (deviceId: string, command: string) => {
    const { data, error } = await supabase.from("tasks").insert([
      {
        target_id: deviceId,
        command: command,
        status: "Waiting",
      },
    ]);
    if (error) throw error;
    return data;
  };

  return { sendCommand };
};

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tenant_id: string; target_id: string; command: string }) => {
      const { data, error } = await supabase
        .from("remote_tasks")
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
      queryClient.invalidateQueries({ queryKey: ["device_tasks"] });
    },
  });
}
