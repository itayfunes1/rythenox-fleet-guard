ALTER TABLE public.managed_devices
ADD COLUMN IF NOT EXISTS last_command_poll_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_managed_devices_last_command_poll_at
ON public.managed_devices (last_command_poll_at);

CREATE INDEX IF NOT EXISTS idx_managed_devices_tenant_last_command_poll_at
ON public.managed_devices (tenant_id, last_command_poll_at);