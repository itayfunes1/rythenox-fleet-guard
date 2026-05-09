
-- 1) Tighten chat_channel_members INSERT to admins only
-- (DM creation and team channel creation already go through SECURITY DEFINER RPCs
--  which bypass RLS, so direct client inserts should be admin-only.)
DROP POLICY IF EXISTS "Insert members in your tenant" ON public.chat_channel_members;

CREATE POLICY "Admins add members in tenant"
ON public.chat_channel_members
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.is_tenant_admin(tenant_id, auth.uid())
);

-- 2) Hide tenants.api_key from regular members.
-- The "Members can view their tenant" SELECT policy still allows reading id/name,
-- but column-level privileges block api_key for client roles.
-- Owners/admins still receive api_key via the SECURITY DEFINER RPC get_tenant_api_key().
REVOKE SELECT (api_key) ON public.tenants FROM anon, authenticated;
