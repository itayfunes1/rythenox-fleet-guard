import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantMember {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  created_at: string;
}

export function useTenantMembers(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant_members", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_members" as any)
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return (data || []) as TenantMember[];
    },
  });
}
