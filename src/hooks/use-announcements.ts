import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenant } from "@/hooks/use-tenant";

export interface Announcement {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;        // 'agent_update' | 'incident' | 'maintenance' | 'info'
  status: string;      // 'active' | 'resolved'
  version: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function useAnnouncements() {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const tenantId = tenant?.tenantId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["server_announcements", tenantId],
    enabled: !!user && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("server_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as Announcement[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`server_announcements-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_announcements", filter: `tenant_id=eq.${tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ["server_announcements", tenantId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const create = useMutation({
    mutationFn: async (input: { title: string; message: string; type: string; version?: string | null }) => {
      if (!user || !tenantId) throw new Error("Not signed in");
      const { error } = await supabase.from("server_announcements").insert({
        tenant_id: tenantId,
        user_id: user.id,
        title: input.title,
        message: input.message,
        type: input.type,
        version: input.version || null,
        status: "active",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["server_announcements", tenantId] }),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("server_announcements")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["server_announcements", tenantId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("server_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["server_announcements", tenantId] }),
  });

  const isPrivileged = tenant?.role === "owner" || tenant?.role === "admin";

  return { ...query, isPrivileged, create, resolve, remove };
}
