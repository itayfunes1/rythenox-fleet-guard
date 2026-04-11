
-- Allow tenant members to update their relay nodes
CREATE POLICY "Members can update tenant relays"
  ON public.relay_nodes FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Allow tenant members to delete their relay nodes
CREATE POLICY "Members can delete tenant relays"
  ON public.relay_nodes FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
