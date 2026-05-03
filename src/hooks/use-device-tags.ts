import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeviceFilter {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  description: string | null;
  tag_query: TagQuery;
  created_at: string;
  updated_at: string;
}

export interface TagQuery {
  all?: string[];
  any?: string[];
  none?: string[];
}

export const TAG_REGEX = /^[a-z0-9]+(:[a-z0-9._-]+)?$/;

export function useSetDeviceTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetId, tags }: { targetId: string; tags: string[] }) => {
      const { error } = await supabase.rpc("set_device_tags", {
        _target_id: targetId,
        _tags: tags,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managed_devices"] });
    },
  });
}

export function useDeviceFilters(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["device_filters", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_filters" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as DeviceFilter[];
    },
  });
}

export function useSaveDeviceFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenantId: string;
      userId: string;
      name: string;
      description?: string;
      tag_query: TagQuery;
    }) => {
      const { error } = await supabase.from("device_filters" as any).insert({
        tenant_id: input.tenantId,
        created_by: input.userId,
        name: input.name,
        description: input.description ?? null,
        tag_query: input.tag_query,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["device_filters"] }),
  });
}

export function useDeleteDeviceFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_filters" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["device_filters"] }),
  });
}

export function matchesTagQuery(tags: string[], q: TagQuery): boolean {
  const all = q.all ?? [];
  const any = q.any ?? [];
  const none = q.none ?? [];
  if (all.length && !all.every((t) => tags.includes(t))) return false;
  if (any.length && !any.some((t) => tags.includes(t))) return false;
  if (none.length && none.some((t) => tags.includes(t))) return false;
  return true;
}
