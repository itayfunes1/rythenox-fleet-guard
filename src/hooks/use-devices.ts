import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ManagedDevice {
  id: string;
  tenant_id: string;
  target_id: string;
  status: "Online" | "Offline";
  os_info: string | null;
  arch: string | null;
  public_ip: string | null;
  last_seen: string | null;
}

export function useDevices(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("managed_devices_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "managed_devices", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["managed_devices", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return useQuery({
    queryKey: ["managed_devices", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managed_devices")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("last_seen", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ManagedDevice[];
    },
  });
}
