CREATE OR REPLACE FUNCTION public.get_tenant_api_key(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT t.api_key
  FROM public.tenants t
  INNER JOIN public.tenant_members tm ON tm.tenant_id = t.id
  WHERE tm.user_id = _user_id
  LIMIT 1;
$$;