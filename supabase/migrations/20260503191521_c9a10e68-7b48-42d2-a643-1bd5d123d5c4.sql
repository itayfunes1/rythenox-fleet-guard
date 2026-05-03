-- 1. Add tags column to managed_devices
ALTER TABLE public.managed_devices
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_managed_devices_tags
  ON public.managed_devices USING GIN (tags);

-- 2. Saved filters table
CREATE TABLE IF NOT EXISTS public.device_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  tag_query jsonb NOT NULL DEFAULT '{"all":[],"any":[],"none":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tenant device filters"
  ON public.device_filters FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members create tenant device filters"
  ON public.device_filters FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Creator or admin updates device filters"
  ON public.device_filters FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (created_by = auth.uid() OR public.is_tenant_admin(tenant_id, auth.uid()))
  );

CREATE POLICY "Creator or admin deletes device filters"
  ON public.device_filters FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (created_by = auth.uid() OR public.is_tenant_admin(tenant_id, auth.uid()))
  );

CREATE TRIGGER trg_device_filters_updated_at
  BEFORE UPDATE ON public.device_filters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RPC: set device tags (validated)
CREATE OR REPLACE FUNCTION public.set_device_tags(_target_id text, _tags text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_tenant uuid;
  cleaned text[];
  t text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  my_tenant := public.get_user_tenant_id(auth.uid());
  IF my_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.managed_devices
    WHERE target_id = _target_id AND tenant_id = my_tenant
  ) THEN
    RAISE EXCEPTION 'Device not found in your organization';
  END IF;

  cleaned := ARRAY(
    SELECT DISTINCT lower(trim(x))
    FROM unnest(COALESCE(_tags, '{}'::text[])) AS x
    WHERE length(trim(x)) > 0
  );

  IF array_length(cleaned, 1) > 20 THEN
    RAISE EXCEPTION 'Maximum 20 tags per device';
  END IF;

  FOREACH t IN ARRAY cleaned LOOP
    IF length(t) > 64 OR t !~ '^[a-z0-9]+(:[a-z0-9._-]+)?$' THEN
      RAISE EXCEPTION 'Invalid tag: %. Use lowercase, optional key:value (e.g. env:prod).', t;
    END IF;
  END LOOP;

  UPDATE public.managed_devices
  SET tags = COALESCE(cleaned, '{}'::text[])
  WHERE target_id = _target_id AND tenant_id = my_tenant;
END;
$$;

-- 4. RPC: match devices by filter query (used by bulk runner in Phase 2)
CREATE OR REPLACE FUNCTION public.match_devices_by_filter(_filter jsonb)
RETURNS TABLE(target_id text, nickname text, status text, tags text[])
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_tenant uuid;
  all_tags text[];
  any_tags text[];
  none_tags text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  my_tenant := public.get_user_tenant_id(auth.uid());
  IF my_tenant IS NULL THEN
    RETURN;
  END IF;

  all_tags  := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_filter->'all',  '[]'::jsonb)));
  any_tags  := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_filter->'any',  '[]'::jsonb)));
  none_tags := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_filter->'none', '[]'::jsonb)));

  RETURN QUERY
  SELECT d.target_id, d.nickname, d.status, d.tags
  FROM public.managed_devices d
  WHERE d.tenant_id = my_tenant
    AND (array_length(all_tags, 1) IS NULL OR d.tags @> all_tags)
    AND (array_length(any_tags, 1) IS NULL OR d.tags && any_tags)
    AND (array_length(none_tags, 1) IS NULL OR NOT (d.tags && none_tags))
  ORDER BY d.nickname NULLS LAST, d.target_id;
END;
$$;