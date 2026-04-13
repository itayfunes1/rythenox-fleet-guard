
CREATE OR REPLACE FUNCTION public.notify_owner_on_join_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_record record;
  tenant_name text;
BEGIN
  -- Get tenant name
  SELECT name INTO tenant_name FROM public.tenants WHERE id = NEW.target_tenant_id;

  -- Notify all owners/admins of the target tenant
  FOR owner_record IN
    SELECT user_id FROM public.tenant_members
    WHERE tenant_id = NEW.target_tenant_id AND role IN ('owner', 'admin')
  LOOP
    INSERT INTO public.notifications (user_id, tenant_id, title, message, type)
    VALUES (
      owner_record.user_id,
      NEW.target_tenant_id,
      'New Join Request',
      NEW.requester_email || ' has requested to join ' || COALESCE(tenant_name, 'your organization') || '. Go to Settings to approve or reject.',
      'info'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_join_request_notify_owner
  AFTER INSERT ON public.org_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_on_join_request();
