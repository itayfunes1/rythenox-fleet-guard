import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export type NotificationCategory =
  | "device_offline"
  | "device_enrolled"
  | "task_completed"
  | "task_failed"
  | "build_finished"
  | "org_requests"
  | "announcements";

export interface NotificationPreferences {
  user_id: string;
  device_offline: boolean;
  device_enrolled: boolean;
  task_completed: boolean;
  task_failed: boolean;
  build_finished: boolean;
  org_requests: boolean;
  announcements: boolean;
  toast_enabled: boolean;
}

const DEFAULTS: Omit<NotificationPreferences, "user_id"> = {
  device_offline: true,
  device_enrolled: true,
  task_completed: true,
  task_failed: true,
  build_finished: true,
  org_requests: true,
  announcements: true,
  toast_enabled: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification_preferences", user?.id],
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!user) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // seed if missing
        const { data: inserted, error: insErr } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id })
          .select("*")
          .single();
        if (insErr) throw insErr;
        return inserted as NotificationPreferences;
      }
      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Omit<NotificationPreferences, "user_id">>) => {
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["notification_preferences", user?.id] });
      const prev = queryClient.getQueryData<NotificationPreferences>(["notification_preferences", user?.id]);
      if (prev) {
        queryClient.setQueryData(["notification_preferences", user?.id], { ...prev, ...patch });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["notification_preferences", user?.id], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notification_preferences", user?.id] }),
  });

  return {
    preferences: query.data ?? ({ user_id: user?.id ?? "", ...DEFAULTS } as NotificationPreferences),
    isLoading: query.isLoading,
    update,
  };
}
