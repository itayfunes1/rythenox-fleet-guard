
-- Public status incidents table
CREATE TABLE public.status_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'investigating', -- investigating | identified | monitoring | resolved
  impact text NOT NULL DEFAULT 'minor', -- minor | major | critical
  affected_services text[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read incidents — this powers the public /status page
CREATE POLICY "Public can view incidents"
  ON public.status_incidents FOR SELECT
  USING (true);

-- Only platform admins can manage incidents
CREATE POLICY "Platform admins can insert incidents"
  ON public.status_incidents FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can update incidents"
  ON public.status_incidents FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can delete incidents"
  ON public.status_incidents FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

CREATE INDEX idx_status_incidents_started_at ON public.status_incidents(started_at DESC);

CREATE TRIGGER update_status_incidents_updated_at
  BEFORE UPDATE ON public.status_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
