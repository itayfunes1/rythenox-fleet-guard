import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export function useTenant() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenant", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return null;

      // Pick the most recent membership — matches get_user_tenant_id() on the server
      const { data, error } = await supabase
        .from("tenant_members" as any)
        .select("tenant_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      const d = data as any;

      const [{ data: tenantRow }, { data: apiKey }, { count: memberCount }] = await Promise.all([
        supabase.from("tenants" as any).select("id, name").eq("id", d.tenant_id).maybeSingle(),
        supabase.rpc("get_tenant_api_key" as any, { _user_id: user.id }),
        supabase
          .from("tenant_members" as any)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", d.tenant_id),
      ]);

      return {
        tenantId: d.tenant_id as string,
        role: d.role as string,
        tenantName: ((tenantRow as any)?.name as string) || "",
        memberCount: memberCount || 1,
        canManageOrganization: ["owner", "admin"].includes(d.role as string),
        apiKey: (apiKey as string) || undefined,
      };
    },
  });
}
