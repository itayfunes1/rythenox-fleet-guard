-- 1. Add version column for agent update announcements
ALTER TABLE public.server_announcements
ADD COLUMN IF NOT EXISTS version text;

-- 2. Trigger function: fan-out notifications to all tenant members on new announcement
CREATE OR REPLACE FUNCTION public.notify_tenant_on_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_record RECORD;
  notif_title text;
  notif_message text;
  notif_type text;
BEGIN
  -- Only fan-out for active announcements
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Compose title/message: include version when present
  IF NEW.version IS NOT NULL AND length(NEW.version) > 0 THEN
    notif_title := NEW.title || ' (' || NEW.version || ')';
  ELSE
    notif_title := NEW.title;
  END IF;
  notif_message := NEW.message;

  -- Map announcement type → notification type
  notif_type := CASE
    WHEN NEW.type = 'agent_update' THEN 'success'
    WHEN NEW.type = 'incident' THEN 'warning'
    WHEN NEW.type = 'maintenance' THEN 'info'
    ELSE COALESCE(NEW.type, 'info')
  END;

  -- Insert one notification per tenant member
  FOR member_record IN
    SELECT user_id FROM public.tenant_members WHERE tenant_id = NEW.tenant_id
  LOOP
    INSERT INTO public.notifications (tenant_id, user_id, title, message, type, read)
    VALUES (NEW.tenant_id, member_record.user_id, notif_title, notif_message, notif_type, false);
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Trigger
DROP TRIGGER IF EXISTS trg_notify_tenant_on_announcement ON public.server_announcements;
CREATE TRIGGER trg_notify_tenant_on_announcement
AFTER INSERT ON public.server_announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_tenant_on_announcement();