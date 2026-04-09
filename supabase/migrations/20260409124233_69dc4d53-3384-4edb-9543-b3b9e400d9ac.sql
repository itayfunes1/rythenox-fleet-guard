
CREATE TABLE public.relay_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  addr TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Offline',
  client_count INTEGER NOT NULL DEFAULT 0,
  throughput TEXT,
  uptime INTEGER NOT NULL DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.relay_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant relays"
ON public.relay_nodes
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.relay_nodes;
