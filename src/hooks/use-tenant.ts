import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTenant() {
  return useQuery({
    queryKey: ["tenant"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("tenant_members" as any)
        .select("tenant_id, role, tenants:tenant_id(id, name)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (error || !data) return null;
      const d = data as any;

      // Fetch API key securely via RPC (owner-only)
      const { data: apiKey } = await supabase.rpc("get_tenant_api_key" as any, {
        _user_id: user.id,
      });

      return {
        tenantId: d.tenant_id as string,
        role: d.role as string,
        tenantName: d.tenants?.name as string,
        apiKey: (apiKey as string) || undefined,
      };
    },
  });
}
