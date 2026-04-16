
-- 1. Drop org-related tables and helper functions (cascade RLS that depends on them)
DROP TABLE IF EXISTS public.team_chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_channel_members CASCADE;
DROP TABLE IF EXISTS public.chat_channels CASCADE;
DROP TABLE IF EXISTS public.org_join_requests CASCADE;

DROP FUNCTION IF EXISTS public.create_default_channel() CASCADE;
DROP FUNCTION IF EXISTS public.is_channel_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.find_tenant_by_name(text) CASCADE;
DROP FUNCTION IF EXISTS public.create_organization(text) CASCADE;
DROP FUNCTION IF EXISTS public.approve_join_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.reject_join_request(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.notify_owner_on_join_request() CASCADE;
DROP FUNCTION IF EXISTS public.add_tenant_member(text) CASCADE;
DROP FUNCTION IF EXISTS public.remove_tenant_member(uuid) CASCADE;

-- 2. Move every user back to their own personal tenant.
-- The personal tenant is the earliest one created by handle_new_user (it has only this user as member, or no members yet).
DO $$
DECLARE
  u record;
  personal_tenant uuid;
  current_tenant uuid;
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    -- Find the user's current tenant (if any)
    SELECT tenant_id INTO current_tenant
    FROM public.tenant_members
    WHERE user_id = u.id
    LIMIT 1;

    -- Find a personal tenant: one where they're the only owner OR an empty tenant created for them.
    -- Prefer one with no other members. Match by name = email-prefix or fall back to current.
    SELECT t.id INTO personal_tenant
    FROM public.tenants t
    WHERE t.name = split_part(u.email, '@', 1)
      AND NOT EXISTS (
        SELECT 1 FROM public.tenant_members tm
        WHERE tm.tenant_id = t.id AND tm.user_id <> u.id
      )
    ORDER BY t.created_at ASC
    LIMIT 1;

    -- If no personal tenant exists, create one.
    IF personal_tenant IS NULL THEN
      INSERT INTO public.tenants (name)
      VALUES (split_part(u.email, '@', 1))
      RETURNING id INTO personal_tenant;
    END IF;

    -- Move all of this user's data from current_tenant to personal_tenant if different.
    IF current_tenant IS NOT NULL AND current_tenant <> personal_tenant THEN
      UPDATE public.managed_devices SET tenant_id = personal_tenant WHERE tenant_id = current_tenant;
      UPDATE public.remote_tasks SET tenant_id = personal_tenant WHERE tenant_id = current_tenant;
      UPDATE public.diagnostic_vault SET tenant_id = personal_tenant WHERE tenant_id = current_tenant;
      UPDATE public.relay_nodes SET tenant_id = personal_tenant WHERE tenant_id = current_tenant;
      UPDATE public.active_sessions SET tenant_id = personal_tenant WHERE tenant_id = current_tenant;
      UPDATE public.notifications SET tenant_id = personal_tenant WHERE tenant_id = current_tenant;
      UPDATE public.server_announcements SET tenant_id = personal_tenant WHERE tenant_id = current_tenant;
    END IF;

    -- Reset membership so user is sole owner of personal_tenant.
    DELETE FROM public.tenant_members WHERE user_id = u.id;
    INSERT INTO public.tenant_members (user_id, tenant_id, role)
    VALUES (u.id, personal_tenant, 'owner');
  END LOOP;
END $$;

-- 3. Delete tenants that now have no members AND no data.
DELETE FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM public.managed_devices md WHERE md.tenant_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM public.remote_tasks rt WHERE rt.tenant_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM public.diagnostic_vault dv WHERE dv.tenant_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM public.relay_nodes rn WHERE rn.tenant_id = t.id);

-- 4. Enforce one user per tenant going forward.
CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_one_per_user ON public.tenant_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_one_per_tenant ON public.tenant_members (tenant_id);

-- 5. Tighten RLS: drop "members can ..." policies and replace with owner-only policies.
DROP POLICY IF EXISTS "Members can view tenant sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.active_sessions;

CREATE POLICY "Users see own sessions" ON public.active_sessions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own sessions" ON public.active_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Users delete own sessions" ON public.active_sessions
  FOR DELETE USING (user_id = auth.uid());

-- 6. Drop the join-request and member-add/remove RPCs already removed above; ensure helper functions remain.
-- get_user_tenant_id and get_tenant_api_key are kept.

-- 7. Hard-restrict tenant_members so users cannot insert/update extra rows.
DROP POLICY IF EXISTS "Owners can insert members" ON public.tenant_members;
DROP POLICY IF EXISTS "Members can view tenant members" ON public.tenant_members;
-- Keep "Users can view their own memberships" only.

-- 8. Lock tenants table writes (already no INSERT/UPDATE/DELETE) — keep SELECT for owner only.
-- Existing policy already restricts SELECT to id = get_user_tenant_id(auth.uid()) which is fine.

-- 9. Update get_tenant_api_key: only the owner of the tenant can read it.
CREATE OR REPLACE FUNCTION public.get_tenant_api_key(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.api_key
  FROM public.tenants t
  INNER JOIN public.tenant_members tm
    ON tm.tenant_id = t.id
   AND tm.user_id = _user_id
   AND tm.role = 'owner'
  LIMIT 1;
$$;
