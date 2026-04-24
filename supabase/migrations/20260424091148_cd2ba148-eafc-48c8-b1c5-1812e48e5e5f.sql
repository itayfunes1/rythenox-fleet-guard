CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = _tenant_id
      AND tm.user_id = _user_id
      AND tm.role IN ('owner', 'admin')
  );
$$;

CREATE TABLE IF NOT EXISTS public.org_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL,
  requester_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_join_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS org_join_requests_one_pending_idx
ON public.org_join_requests (tenant_id, requester_id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS org_join_requests_tenant_status_idx
ON public.org_join_requests (tenant_id, status, created_at DESC);

ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requesters can view their org join requests" ON public.org_join_requests;
CREATE POLICY "Requesters can view their org join requests"
ON public.org_join_requests
FOR SELECT
TO authenticated
USING (requester_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view tenant org join requests" ON public.org_join_requests;
CREATE POLICY "Admins can view tenant org join requests"
ON public.org_join_requests
FOR SELECT
TO authenticated
USING (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.search_organizations(search_text text)
RETURNS TABLE(tenant_id uuid, name text, member_count bigint, has_pending_request boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id AS tenant_id,
    t.name,
    COUNT(tm.id)::bigint AS member_count,
    EXISTS (
      SELECT 1
      FROM public.org_join_requests ojr
      WHERE ojr.tenant_id = t.id
        AND ojr.requester_id = auth.uid()
        AND ojr.status = 'pending'
    ) AS has_pending_request
  FROM public.tenants t
  LEFT JOIN public.tenant_members tm ON tm.tenant_id = t.id
  WHERE auth.uid() IS NOT NULL
    AND length(trim(COALESCE(search_text, ''))) >= 2
    AND t.name ILIKE '%' || trim(search_text) || '%'
  GROUP BY t.id, t.name
  ORDER BY t.name ASC
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.create_organization(org_name text)
RETURNS TABLE(tenant_id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  cleaned_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  cleaned_name := trim(COALESCE(org_name, ''));
  IF length(cleaned_name) < 2 THEN
    RAISE EXCEPTION 'Organization name is too short';
  END IF;

  INSERT INTO public.tenants (name)
  VALUES (cleaned_name)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, auth.uid(), 'owner');

  RETURN QUERY SELECT new_tenant_id, cleaned_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_join_organization(_tenant_id uuid, _message text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id uuid;
  requester_email text;
  admin_record record;
  org_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are already a member of this organization';
  END IF;

  SELECT email INTO requester_email
  FROM auth.users
  WHERE id = auth.uid();

  SELECT name INTO org_name
  FROM public.tenants
  WHERE id = _tenant_id;

  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  INSERT INTO public.org_join_requests (tenant_id, requester_id, requester_email, message)
  VALUES (_tenant_id, auth.uid(), COALESCE(requester_email, 'unknown'), NULLIF(trim(COALESCE(_message, '')), ''))
  RETURNING id INTO request_id;

  FOR admin_record IN
    SELECT user_id FROM public.tenant_members
    WHERE tenant_id = _tenant_id AND role IN ('owner', 'admin')
  LOOP
    INSERT INTO public.notifications (tenant_id, user_id, title, message, type, read)
    VALUES (_tenant_id, admin_record.user_id, 'Organization join request', COALESCE(requester_email, 'A user') || ' requested access to ' || org_name || '.', 'info', false);
  END LOOP;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  org_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO req
  FROM public.org_join_requests
  WHERE id = _request_id
    AND status = 'pending'
  FOR UPDATE;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Pending request not found';
  END IF;

  IF NOT public.is_tenant_admin(req.tenant_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only organization admins can approve requests';
  END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (req.tenant_id, req.requester_id, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE public.org_join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;

  SELECT name INTO org_name FROM public.tenants WHERE id = req.tenant_id;
  INSERT INTO public.notifications (tenant_id, user_id, title, message, type, read)
  VALUES (req.tenant_id, req.requester_id, 'Join request approved', 'You now have access to ' || COALESCE(org_name, 'the organization') || '.', 'success', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
  org_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO req
  FROM public.org_join_requests
  WHERE id = _request_id
    AND status = 'pending'
  FOR UPDATE;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Pending request not found';
  END IF;

  IF NOT public.is_tenant_admin(req.tenant_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only organization admins can reject requests';
  END IF;

  UPDATE public.org_join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;

  SELECT name INTO org_name FROM public.tenants WHERE id = req.tenant_id;
  INSERT INTO public.notifications (tenant_id, user_id, title, message, type, read)
  VALUES (req.tenant_id, req.requester_id, 'Join request rejected', 'Your request to join ' || COALESCE(org_name, 'the organization') || ' was rejected.', 'warning', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_api_key(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.api_key
  FROM public.tenants t
  INNER JOIN public.tenant_members tm
    ON tm.tenant_id = t.id
   AND tm.user_id = _user_id
   AND tm.role IN ('owner', 'admin')
  LIMIT 1;
$$;