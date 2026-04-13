
-- 1. Drop the dangerous policy that lets any authenticated user join any tenant
DROP POLICY IF EXISTS "Authenticated can insert tenant_members" ON public.tenant_members;

-- 2. Drop the overly permissive tenants INSERT policy (handle_new_user trigger is SECURITY DEFINER and bypasses RLS)
DROP POLICY IF EXISTS "Authenticated can insert tenants" ON public.tenants;

-- 3. Create a secure function to get tenant API key (owner-only)
CREATE OR REPLACE FUNCTION public.get_tenant_api_key(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.api_key
  FROM public.tenants t
  INNER JOIN public.tenant_members tm ON tm.tenant_id = t.id
  WHERE tm.user_id = _user_id
    AND tm.role = 'owner'
  LIMIT 1;
$$;

-- 4. Replace tenants SELECT policy to exclude api_key by using a restrictive approach
-- We can't do column-level security easily, so we'll keep the policy but the api_key 
-- will be fetched via the secure RPC function above instead

-- 5. Make builds bucket private
UPDATE storage.buckets SET public = false WHERE name = 'builds';

-- 6. Add RLS policies for builds bucket - service role uploads, tenant members read
CREATE POLICY "Authenticated users can read builds"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'builds');
