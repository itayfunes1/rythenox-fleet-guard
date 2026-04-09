import { useQuery } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["managed_devices", tenantId],
    enabled: !!tenantId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managed_devices" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("last_seen", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ManagedDevice[];
    },
  });
}
