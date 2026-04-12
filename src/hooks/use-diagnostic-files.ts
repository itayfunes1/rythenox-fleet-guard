import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiagnosticEntry {
  id: string;
  tenant_id: string;
  target_id: string;
  type: "image" | "audio" | "text" | "loot";
  file_url: string;
  created_at: string;
}

export function useDiagnosticFiles(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["diagnostic_vault", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_vault" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DiagnosticEntry[];
    },
  });
}
