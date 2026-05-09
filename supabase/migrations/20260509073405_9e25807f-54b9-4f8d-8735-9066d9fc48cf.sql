
CREATE TABLE IF NOT EXISTS public.status_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  notify_emails text[] NOT NULL DEFAULT ARRAY['monitor@rythenox.com']::text[],
  email_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.status_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.status_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read status settings"
  ON public.status_settings FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update status settings"
  ON public.status_settings FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Track which auto-incidents have already triggered an email per action,
-- so the public-status probe doesn't email repeatedly on every poll.
CREATE TABLE IF NOT EXISTS public.status_incident_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.status_incidents(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('opened','updated','resolved')),
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incident_id, action, recipient_email)
);

ALTER TABLE public.status_incident_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read incident notifications"
  ON public.status_incident_notifications FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins full control of incidents from the admin page
CREATE POLICY "Platform admins can manage incidents"
  ON public.status_incidents FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));
