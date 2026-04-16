
-- Drop global unique constraint on target_id (causes cross-tenant device collisions)
ALTER TABLE public.managed_devices DROP CONSTRAINT IF EXISTS managed_devices_target_id_key;

-- Add composite unique so each tenant can have its own device with the same target_id
ALTER TABLE public.managed_devices
  ADD CONSTRAINT managed_devices_tenant_target_unique UNIQUE (tenant_id, target_id);
