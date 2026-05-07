
-- 1) Hide tenants.api_key from direct SELECT — admins must use get_tenant_api_key() RPC
REVOKE SELECT (api_key) ON public.tenants FROM authenticated, anon;

-- 2) Restrict audit_log reads to tenant owners/admins (was: all members)
DROP POLICY IF EXISTS "Members view tenant audit log" ON public.audit_log;
CREATE POLICY "Admins view tenant audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.is_tenant_admin(tenant_id, auth.uid())
);
