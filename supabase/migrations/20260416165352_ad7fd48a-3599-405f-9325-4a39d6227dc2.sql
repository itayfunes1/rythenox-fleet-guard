
-- Function to remove a member from the org (owner/admin only, cannot remove owners)
CREATE OR REPLACE FUNCTION public.remove_tenant_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant uuid;
  caller_role text;
  target_record record;
BEGIN
  -- Get caller's tenant and role
  SELECT tenant_id, role INTO caller_tenant, caller_role
  FROM public.tenant_members
  WHERE user_id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Not authorized to remove members';
  END IF;

  -- Get the target member
  SELECT * INTO target_record
  FROM public.tenant_members
  WHERE id = _member_id AND tenant_id = caller_tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found in your organization';
  END IF;

  IF target_record.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove the organization owner';
  END IF;

  -- Remove from all chat channels in this tenant
  DELETE FROM public.chat_channel_members
  WHERE user_id = target_record.user_id
    AND channel_id IN (SELECT id FROM public.chat_channels WHERE tenant_id = caller_tenant);

  -- Remove the membership
  DELETE FROM public.tenant_members WHERE id = _member_id;
END;
$$;

-- Function to add a member by email (owner/admin only)
CREATE OR REPLACE FUNCTION public.add_tenant_member(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant uuid;
  caller_role text;
  target_user_id uuid;
BEGIN
  -- Get caller's tenant and role
  SELECT tenant_id, role INTO caller_tenant, caller_role
  FROM public.tenant_members
  WHERE user_id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Not authorized to add members';
  END IF;

  -- Find user by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = lower(trim(_email));

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with that email address';
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = target_user_id AND tenant_id = caller_tenant) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;

  -- Remove from old org
  DELETE FROM public.tenant_members WHERE user_id = target_user_id;

  -- Add to new org
  INSERT INTO public.tenant_members (user_id, tenant_id, role)
  VALUES (target_user_id, caller_tenant, 'member');

  -- Add to all org-wide channels
  INSERT INTO public.chat_channel_members (channel_id, user_id, user_email)
  SELECT cc.id, target_user_id, _email
  FROM public.chat_channels cc
  WHERE cc.tenant_id = caller_tenant AND cc.type = 'channel'
  ON CONFLICT (channel_id, user_id) DO NOTHING;
END;
$$;
