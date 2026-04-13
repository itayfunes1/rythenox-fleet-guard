import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrgJoinRequest {
  id: string;
  requester_id: string;
  requester_email: string;
  target_tenant_id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function useMyJoinRequests() {
  return useQuery({
    queryKey: ["my_join_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_join_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OrgJoinRequest[];
    },
  });
}

export function usePendingJoinRequests(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["pending_join_requests", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_join_requests" as any)
        .select("*")
        .eq("target_tenant_id", tenantId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OrgJoinRequest[];
    },
  });
}

export function useFindTenant() {
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc("find_tenant_by_name" as any, { _name: name });
      if (error) throw error;
      return (data || []) as unknown as { id: string; name: string }[];
    },
  });
}

export function useRequestJoinOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { requester_id: string; requester_email: string; target_tenant_id: string }) => {
      const { error } = await supabase
        .from("org_join_requests" as any)
        .insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_join_requests"] });
    },
  });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("approve_join_request" as any, { _request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_join_requests"] });
    },
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("reject_join_request" as any, { _request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_join_requests"] });
    },
  });
}
