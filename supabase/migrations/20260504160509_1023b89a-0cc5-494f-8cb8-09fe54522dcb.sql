
-- 1. audit_log: remove client INSERT (forgery risk). Triggers use SECURITY DEFINER so they bypass RLS.
DROP POLICY IF EXISTS "Members insert tenant audit log" ON public.audit_log;

-- 2. tenants.api_key: revoke direct column SELECT; clients must use get_tenant_api_key()
REVOKE SELECT ON public.tenants FROM anon, authenticated;
GRANT SELECT (id, name, created_at) ON public.tenants TO anon, authenticated;

-- 3. builds storage: tenant-scoped read
DROP POLICY IF EXISTS "Authenticated users can read builds" ON storage.objects;

CREATE POLICY "Members read own tenant builds"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'builds'
  AND EXISTS (
    SELECT 1 FROM public.build_history bh
    WHERE bh.tenant_id = public.get_user_tenant_id(auth.uid())
      AND (storage.objects.name = bh.build_id || '.exe'
           OR storage.objects.name LIKE bh.build_id || '/%')
  )
);

-- 4. platform_admins allow-list
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view platform admins"
ON public.platform_admins FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins p WHERE p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

-- 6. Revoke EXECUTE on SECURITY DEFINER functions from anon (clients are authenticated)
REVOKE EXECUTE ON FUNCTION public.get_or_create_dm_channel(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_tenant_members() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_tenant_api_key(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_channel_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.chat_channel_tenant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_team_channel(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_organizations(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_organization(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_join_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_tenant_admins(uuid, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, uuid, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_join_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_join_organization(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.detect_offline_devices() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_device_tags(text, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_devices_by_filter(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, uuid, text, text, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_sessions() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon;
