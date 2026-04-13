
-- Org join requests table
CREATE TABLE public.org_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  requester_email text NOT NULL,
  target_tenant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can view their own requests
CREATE POLICY "Users can view their own requests"
  ON public.org_join_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- Org owners/admins can view requests for their org
CREATE POLICY "Owners can view org requests"
  ON public.org_join_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = org_join_requests.target_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Anyone authenticated can create a request
CREATE POLICY "Users can create join requests"
  ON public.org_join_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Owners/admins can update (approve/reject) requests
CREATE POLICY "Owners can resolve requests"
  ON public.org_join_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = org_join_requests.target_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Function to find a tenant by name (public lookup)
CREATE OR REPLACE FUNCTION public.find_tenant_by_name(_name text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name
  FROM public.tenants t
  WHERE lower(t.name) = lower(_name)
  LIMIT 5;
$$;

-- Function to approve a join request (moves user to new tenant)
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  approver_role text;
BEGIN
  -- Get the request
  SELECT * INTO req FROM public.org_join_requests WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already resolved';
  END IF;

  -- Verify caller is owner/admin of target tenant
  SELECT role INTO approver_role
  FROM public.tenant_members
  WHERE tenant_id = req.target_tenant_id AND user_id = auth.uid();

  IF approver_role IS NULL OR approver_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Not authorized to approve requests';
  END IF;

  -- Update the user's tenant membership (remove old, add new)
  DELETE FROM public.tenant_members WHERE user_id = req.requester_id;

  INSERT INTO public.tenant_members (user_id, tenant_id, role)
  VALUES (req.requester_id, req.target_tenant_id, 'member');

  -- Also add them to all 'channel' type chat channels in the new tenant
  INSERT INTO public.chat_channel_members (channel_id, user_id, user_email)
  SELECT cc.id, req.requester_id, req.requester_email
  FROM public.chat_channels cc
  WHERE cc.tenant_id = req.target_tenant_id AND cc.type = 'channel'
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  -- Mark request as approved
  UPDATE public.org_join_requests
  SET status = 'approved', resolved_at = now(), resolved_by = auth.uid()
  WHERE id = _request_id;
END;
$$;

-- Function to reject a join request
CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  approver_role text;
BEGIN
  SELECT * INTO req FROM public.org_join_requests WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already resolved';
  END IF;

  SELECT role INTO approver_role
  FROM public.tenant_members
  WHERE tenant_id = req.target_tenant_id AND user_id = auth.uid();

  IF approver_role IS NULL OR approver_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.org_join_requests
  SET status = 'rejected', resolved_at = now(), resolved_by = auth.uid()
  WHERE id = _request_id;
END;
$$;
