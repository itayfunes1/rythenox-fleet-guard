
CREATE OR REPLACE FUNCTION public.create_organization(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  caller_id uuid := auth.uid();
  caller_email text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(_name) = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;

  -- Get caller email
  SELECT email INTO caller_email FROM auth.users WHERE id = caller_id;

  -- Create new tenant
  INSERT INTO public.tenants (name)
  VALUES (trim(_name))
  RETURNING id INTO new_tenant_id;

  -- Remove from current org
  DELETE FROM public.tenant_members WHERE user_id = caller_id;

  -- Add as owner of new org
  INSERT INTO public.tenant_members (user_id, tenant_id, role)
  VALUES (caller_id, new_tenant_id, 'owner');

  RETURN new_tenant_id;
END;
$$;
