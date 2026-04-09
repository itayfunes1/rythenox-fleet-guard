
-- Drop overly permissive policies
DROP POLICY "Service can insert tenants" ON public.tenants;
DROP POLICY "Service can insert tenant_members" ON public.tenant_members;

-- Replace with authenticated-only policies
CREATE POLICY "Authenticated can insert tenants"
  ON public.tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert tenant_members"
  ON public.tenant_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
