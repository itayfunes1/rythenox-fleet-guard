
ALTER TABLE public.managed_devices ADD COLUMN nickname text DEFAULT NULL;

CREATE POLICY "Members can update device nickname"
ON public.managed_devices FOR UPDATE
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
