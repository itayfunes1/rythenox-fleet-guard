
-- 1. Tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tenant members (links users to tenants)
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 3. Managed devices
CREATE TABLE public.managed_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Offline' CHECK (status IN ('Online','Offline')),
  os_info TEXT,
  arch TEXT,
  public_ip TEXT,
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- 4. Remote tasks
CREATE TABLE public.remote_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Sent','Completed','Failed')),
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Diagnostic vault
CREATE TABLE public.diagnostic_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image','audio','text')),
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Security definer function to get user's tenant_id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = _user_id LIMIT 1;
$$;

-- 7. Indexes
CREATE INDEX idx_managed_devices_tenant ON public.managed_devices(tenant_id);
CREATE INDEX idx_remote_tasks_tenant ON public.remote_tasks(tenant_id);
CREATE INDEX idx_remote_tasks_status ON public.remote_tasks(status);
CREATE INDEX idx_diagnostic_vault_tenant ON public.diagnostic_vault(tenant_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);

-- 8. RLS policies for tenant_members
CREATE POLICY "Users can view their own memberships"
  ON public.tenant_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert members"
  ON public.tenant_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
  );

-- 9. RLS policies for tenants
CREATE POLICY "Members can view their tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id(auth.uid()));

-- 10. RLS policies for managed_devices
CREATE POLICY "Members can view tenant devices"
  ON public.managed_devices FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 11. RLS policies for remote_tasks
CREATE POLICY "Members can view tenant tasks"
  ON public.remote_tasks FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members can create tenant tasks"
  ON public.remote_tasks FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 12. RLS policies for diagnostic_vault
CREATE POLICY "Members can view tenant diagnostics"
  ON public.diagnostic_vault FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
