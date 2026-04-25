ALTER TABLE public.tenant_members
DROP CONSTRAINT IF EXISTS tenant_members_user_id_tenant_id_key;

DROP INDEX IF EXISTS public.tenant_members_one_per_user;
DROP INDEX IF EXISTS public.tenant_members_one_per_tenant;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_tenant_user_unique_idx
ON public.tenant_members (tenant_id, user_id);