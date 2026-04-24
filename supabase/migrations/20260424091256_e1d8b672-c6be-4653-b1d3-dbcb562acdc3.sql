CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_tenant_user_unique_idx
ON public.tenant_members (tenant_id, user_id);

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.tenant_members
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_api_key(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.api_key
  FROM public.tenants t
  INNER JOIN public.tenant_members tm
    ON tm.tenant_id = t.id
   AND tm.user_id = _user_id
   AND tm.role IN ('owner', 'admin')
  WHERE t.id = public.get_user_tenant_id(_user_id)
  LIMIT 1;
$$;