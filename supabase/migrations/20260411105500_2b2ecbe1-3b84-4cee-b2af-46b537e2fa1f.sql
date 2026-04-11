
CREATE TABLE public.active_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  target_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant sessions"
  ON public.active_sessions FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert their own sessions"
  ON public.active_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete their own sessions"
  ON public.active_sessions FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE active_sessions;
