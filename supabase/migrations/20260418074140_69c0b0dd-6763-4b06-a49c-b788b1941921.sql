CREATE TABLE public.build_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  build_id TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'building',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_build_history_tenant_created ON public.build_history(tenant_id, created_at DESC);

ALTER TABLE public.build_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant builds"
ON public.build_history FOR SELECT
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members can create tenant builds"
ON public.build_history FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Members can update tenant builds"
ON public.build_history FOR UPDATE
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

ALTER TABLE public.build_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.build_history;