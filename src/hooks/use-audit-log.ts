import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface AuditEntry {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useAuditLog(filters?: { action?: string; entityType?: string; search?: string }) {
  const { data: tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`audit_log_${tenantId}_${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ["audit_log", tenantId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  return useQuery({
    queryKey: ["audit_log", tenantId, filters],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters?.action) q = q.eq("action", filters.action);
      if (filters?.entityType) q = q.eq("entity_type", filters.entityType);

      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as AuditEntry[];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.action.toLowerCase().includes(s) ||
            r.entity_type.toLowerCase().includes(s) ||
            (r.actor_email ?? "").toLowerCase().includes(s) ||
            (r.entity_id ?? "").toLowerCase().includes(s),
        );
      }
      return rows;
    },
  });
}
