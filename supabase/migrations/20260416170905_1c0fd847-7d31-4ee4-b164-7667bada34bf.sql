
-- Move user back to original tenant with active infrastructure
DELETE FROM public.tenant_members WHERE user_id = '8ee14497-ba37-4783-b149-2ef4eea06d4b';
INSERT INTO public.tenant_members (user_id, tenant_id, role)
VALUES ('8ee14497-ba37-4783-b149-2ef4eea06d4b', '55928d88-d7e7-4d5d-9fa8-a0811d0dc4f7', 'owner');
