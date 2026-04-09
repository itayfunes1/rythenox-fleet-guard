import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RelayNode {
  id: string;
  tenant_id: string;
  addr: string;
  status: string;
  client_count: number;
  throughput: string | null;
  uptime: number;
  last_seen: string | null;
}

export function useRelays(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("relay_nodes_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "relay_nodes", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["relay_nodes", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ["relay_nodes", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relay_nodes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("last_seen", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as RelayNode[];
    },
  });
}
