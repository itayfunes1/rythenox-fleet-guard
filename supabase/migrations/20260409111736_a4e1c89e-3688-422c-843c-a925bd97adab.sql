
-- Function to auto-create tenant + membership on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a tenant for the new user
  INSERT INTO public.tenants (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  RETURNING id INTO new_tenant_id;

  -- Add user as owner
  INSERT INTO public.tenant_members (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Allow the trigger (security definer) to insert tenants
CREATE POLICY "Service can insert tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (true);

-- Allow service to insert tenant_members (the trigger runs as definer)
CREATE POLICY "Service can insert tenant_members"
  ON public.tenant_members FOR INSERT
  WITH CHECK (true);
