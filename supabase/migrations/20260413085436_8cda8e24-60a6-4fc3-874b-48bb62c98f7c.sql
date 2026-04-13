
-- Create server_announcements table for uptime/status announcements
CREATE TABLE public.server_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.server_announcements ENABLE ROW LEVEL SECURITY;

-- Tenant members can view announcements
CREATE POLICY "Members can view tenant announcements"
ON public.server_announcements
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Only owners/admins can create announcements
CREATE POLICY "Owners can create announcements"
ON public.server_announcements
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = server_announcements.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

-- Owners/admins can update (resolve) announcements
CREATE POLICY "Owners can update announcements"
ON public.server_announcements
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = server_announcements.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

-- Owners/admins can delete announcements
CREATE POLICY "Owners can delete announcements"
ON public.server_announcements
FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = server_announcements.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

-- Index for faster tenant lookups
CREATE INDEX idx_server_announcements_tenant ON public.server_announcements(tenant_id, created_at DESC);
