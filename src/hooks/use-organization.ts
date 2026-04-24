import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export type OrganizationSearchResult = {
  tenant_id: string;
  name: string;
  member_count: number;
  has_pending_request: boolean;
};

export type OrgJoinRequest = {
  id: string;
  tenant_id: string;
  requester_id: string;
  requester_email: string;
  status: string;
  message: string | null;
  created_at: string;
};

export function useOrganizationSearch(searchText: string) {
  const query = searchText.trim();

  return useQuery({
    queryKey: ["organization-search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_organizations" as any, {
        search_text: query,
      });

      if (error) throw error;
      return (data || []) as OrganizationSearchResult[];
    },
  });
}

export function useJoinRequests(tenantId: string | undefined, canManage: boolean) {
  return useQuery({
    queryKey: ["org-join-requests", tenantId],
    enabled: !!tenantId && canManage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_join_requests" as any)
        .select("id, tenant_id, requester_id, requester_email, status, message, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ((data || []) as unknown) as OrgJoinRequest[];
    },
  });
}

export function useOrganizationMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const refreshOrganizationData = () => {
    queryClient.invalidateQueries({ queryKey: ["tenant", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["organization-search"] });
    queryClient.invalidateQueries({ queryKey: ["org-join-requests"] });
    queryClient.invalidateQueries({ queryKey: ["managed_devices"] });
    queryClient.invalidateQueries({ queryKey: ["remote_tasks"] });
    queryClient.invalidateQueries({ queryKey: ["diagnostic_vault"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const createOrganization = useMutation({
    mutationFn: async (orgName: string) => {
      const { data, error } = await supabase.rpc("create_organization" as any, {
        org_name: orgName,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: refreshOrganizationData,
  });

  const requestJoin = useMutation({
    mutationFn: async ({ tenantId, message }: { tenantId: string; message?: string }) => {
      const { data, error } = await supabase.rpc("request_join_organization" as any, {
        _tenant_id: tenantId,
        _message: message || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: refreshOrganizationData,
  });

  const approveJoinRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("approve_join_request" as any, {
        _request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: refreshOrganizationData,
  });

  const rejectJoinRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("reject_join_request" as any, {
        _request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: refreshOrganizationData,
  });

  return { createOrganization, requestJoin, approveJoinRequest, rejectJoinRequest };
}