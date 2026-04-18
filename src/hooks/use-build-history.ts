import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";

export interface BuildHistoryEntry {
  id: string;
  build_id: string;
  tenant_id: string;
  user_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export function useBuildHistory() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["build_history", tenant?.tenantId],
    enabled: !!tenant?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("build_history" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as BuildHistoryEntry[];
    },
  });

  useEffect(() => {
    if (!tenant?.tenantId) return;
    const channel = supabase
      .channel("build_history_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "build_history" },
        () => queryClient.invalidateQueries({ queryKey: ["build_history", tenant.tenantId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.tenantId, queryClient]);

  const recordBuild = async (buildId: string) => {
    if (!user?.id || !tenant?.tenantId) return;
    await supabase.from("build_history" as any).insert({
      build_id: buildId,
      tenant_id: tenant.tenantId,
      user_id: user.id,
      status: "building",
    } as any);
  };

  const markBuildReady = async (buildId: string) => {
    await supabase
      .from("build_history" as any)
      .update({ status: "ready", completed_at: new Date().toISOString() } as any)
      .eq("build_id", buildId);
  };

  const markBuildFailed = async (buildId: string) => {
    await supabase
      .from("build_history" as any)
      .update({ status: "failed", completed_at: new Date().toISOString() } as any)
      .eq("build_id", buildId);
  };

  return { ...query, recordBuild, markBuildReady, markBuildFailed };
}
