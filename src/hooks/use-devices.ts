import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDeviceResponsive, isDeviceVisible } from "@/lib/device-presence";

export interface ManagedDevice {
  id: string;
  tenant_id: string;
  target_id: string;
  status: "Online" | "Offline";
  os_info: string | null;
  arch: string | null;
  public_ip: string | null;
  last_seen: string | null;
  nickname: string | null;
  tags: string[];
  isResponsive: boolean;
}

export function useDevices(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`managed_devices_realtime_${tenantId}_${Math.random().toString(36).slice(2, 8)}`)
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
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managed_devices")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("last_seen", { ascending: false });

      if (error) throw error;

      const now = Date.now();

      return ((data || []) as Omit<ManagedDevice, "isResponsive">[])
        .filter((device) => isDeviceVisible(device.last_seen, now))
        .map((device) => {
          const responsive = isDeviceResponsive(device.status, device.last_seen, now);

          return {
            ...device,
            status: responsive ? "Online" : "Offline",
            isResponsive: responsive,
          } satisfies ManagedDevice;
        });
    },
  });
}

export function useUpdateNickname() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, nickname }: { id: string; nickname: string | null }) => {
      const { error } = await supabase
        .from("managed_devices")
        .update({ nickname } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed_devices"] });
    },
  });
}
