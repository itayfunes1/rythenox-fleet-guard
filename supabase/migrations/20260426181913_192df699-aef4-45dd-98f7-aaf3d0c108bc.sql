
-- 1. notification_preferences table
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  device_offline boolean NOT NULL DEFAULT true,
  device_enrolled boolean NOT NULL DEFAULT true,
  task_completed boolean NOT NULL DEFAULT true,
  task_failed boolean NOT NULL DEFAULT true,
  build_finished boolean NOT NULL DEFAULT true,
  org_requests boolean NOT NULL DEFAULT true,
  announcements boolean NOT NULL DEFAULT true,
  toast_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own prefs" ON public.notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notif_prefs_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Extend handle_new_user to seed prefs row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.tenant_members (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Helper: notify all admins of a tenant respecting category prefs
CREATE OR REPLACE FUNCTION public.notify_tenant_admins(
  _tenant_id uuid,
  _category text,
  _title text,
  _message text,
  _type text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient record;
  pref_enabled boolean;
BEGIN
  FOR recipient IN
    SELECT user_id FROM public.tenant_members
    WHERE tenant_id = _tenant_id AND role IN ('owner','admin')
  LOOP
    -- look up the user's category preference (default true if no row)
    EXECUTE format(
      'SELECT COALESCE((SELECT %I FROM public.notification_preferences WHERE user_id = $1), true)',
      _category
    ) INTO pref_enabled USING recipient.user_id;

    IF pref_enabled THEN
      INSERT INTO public.notifications (tenant_id, user_id, title, message, type, read)
      VALUES (_tenant_id, recipient.user_id, _title, _message, _type, false);
    END IF;
  END LOOP;
END;
$$;

-- 3. Helper: notify a single user respecting category pref
CREATE OR REPLACE FUNCTION public.notify_user(
  _tenant_id uuid,
  _user_id uuid,
  _category text,
  _title text,
  _message text,
  _type text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pref_enabled boolean;
BEGIN
  EXECUTE format(
    'SELECT COALESCE((SELECT %I FROM public.notification_preferences WHERE user_id = $1), true)',
    _category
  ) INTO pref_enabled USING _user_id;

  IF pref_enabled THEN
    INSERT INTO public.notifications (tenant_id, user_id, title, message, type, read)
    VALUES (_tenant_id, _user_id, _title, _message, _type, false);
  END IF;
END;
$$;

-- 4. Triggers

-- managed_devices: new enrollment
CREATE OR REPLACE FUNCTION public.notify_device_enrolled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_tenant_admins(
    NEW.tenant_id,
    'device_enrolled',
    'New device enrolled',
    'Device ' || COALESCE(NEW.nickname, NEW.target_id) || ' joined the fleet.',
    'success'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_device_enrolled
AFTER INSERT ON public.managed_devices
FOR EACH ROW EXECUTE FUNCTION public.notify_device_enrolled();

-- managed_devices: status flip Online -> Offline
CREATE OR REPLACE FUNCTION public.notify_device_offline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Offline' AND COALESCE(OLD.status,'') <> 'Offline' THEN
    PERFORM public.notify_tenant_admins(
      NEW.tenant_id,
      'device_offline',
      'Device went offline',
      'Device ' || COALESCE(NEW.nickname, NEW.target_id) || ' stopped responding.',
      'warning'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_device_offline
AFTER UPDATE OF status ON public.managed_devices
FOR EACH ROW EXECUTE FUNCTION public.notify_device_offline();

-- remote_tasks: completed / failed
CREATE OR REPLACE FUNCTION public.notify_task_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  device_label text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(nickname, target_id) INTO device_label
  FROM public.managed_devices
  WHERE tenant_id = NEW.tenant_id AND target_id = NEW.target_id
  LIMIT 1;

  device_label := COALESCE(device_label, NEW.target_id);

  IF NEW.status = 'Completed' THEN
    PERFORM public.notify_tenant_admins(
      NEW.tenant_id,
      'task_completed',
      'Task completed',
      'Task on ' || device_label || ' completed: ' || left(NEW.command, 80),
      'success'
    );
  ELSIF NEW.status = 'Failed' THEN
    PERFORM public.notify_tenant_admins(
      NEW.tenant_id,
      'task_failed',
      'Task failed',
      'Task on ' || device_label || ' failed: ' || left(NEW.command, 80),
      'error'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_status
AFTER UPDATE OF status ON public.remote_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_status();

-- build_history: status change
CREATE OR REPLACE FUNCTION public.notify_build_finished()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('ready','completed','success') THEN
    PERFORM public.notify_user(
      NEW.tenant_id, NEW.user_id, 'build_finished',
      'Build ready',
      'Build ' || NEW.build_id || ' is ready to download.',
      'success'
    );
  ELSIF NEW.status IN ('failed','error') THEN
    PERFORM public.notify_user(
      NEW.tenant_id, NEW.user_id, 'build_finished',
      'Build failed',
      'Build ' || NEW.build_id || ' failed to generate.',
      'error'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_build_finished
AFTER UPDATE OF status ON public.build_history
FOR EACH ROW EXECUTE FUNCTION public.notify_build_finished();

-- 5. Replace inline notifications inside approve/reject join-request RPCs to honour prefs
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  req record;
  org_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO req FROM public.org_join_requests
  WHERE id = _request_id AND status = 'pending' FOR UPDATE;

  IF req.id IS NULL THEN RAISE EXCEPTION 'Pending request not found'; END IF;
  IF NOT public.is_tenant_admin(req.tenant_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only organization admins can approve requests';
  END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (req.tenant_id, req.requester_id, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE public.org_join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;

  SELECT name INTO org_name FROM public.tenants WHERE id = req.tenant_id;

  PERFORM public.notify_user(
    req.tenant_id, req.requester_id, 'org_requests',
    'Join request approved',
    'You now have access to ' || COALESCE(org_name,'the organization') || '.',
    'success'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  req record;
  org_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO req FROM public.org_join_requests
  WHERE id = _request_id AND status = 'pending' FOR UPDATE;

  IF req.id IS NULL THEN RAISE EXCEPTION 'Pending request not found'; END IF;
  IF NOT public.is_tenant_admin(req.tenant_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only organization admins can reject requests';
  END IF;

  UPDATE public.org_join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;

  SELECT name INTO org_name FROM public.tenants WHERE id = req.tenant_id;

  PERFORM public.notify_user(
    req.tenant_id, req.requester_id, 'org_requests',
    'Join request rejected',
    'Your request to join ' || COALESCE(org_name,'the organization') || ' was rejected.',
    'warning'
  );
END;
$function$;

-- Update request_join_organization to use notify_tenant_admins (respects prefs)
CREATE OR REPLACE FUNCTION public.request_join_organization(_tenant_id uuid, _message text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  request_id uuid;
  requester_email text;
  org_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF EXISTS (SELECT 1 FROM public.tenant_members
             WHERE tenant_id = _tenant_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already a member of this organization';
  END IF;

  SELECT email INTO requester_email FROM auth.users WHERE id = auth.uid();
  SELECT name INTO org_name FROM public.tenants WHERE id = _tenant_id;

  IF org_name IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;

  INSERT INTO public.org_join_requests (tenant_id, requester_id, requester_email, message)
  VALUES (_tenant_id, auth.uid(), COALESCE(requester_email,'unknown'),
          NULLIF(trim(COALESCE(_message,'')), ''))
  RETURNING id INTO request_id;

  PERFORM public.notify_tenant_admins(
    _tenant_id, 'org_requests',
    'Organization join request',
    COALESCE(requester_email,'A user') || ' requested access to ' || org_name || '.',
    'info'
  );

  RETURN request_id;
END;
$function$;

-- 6. Auto-detect offline devices (sweep)
CREATE OR REPLACE FUNCTION public.detect_offline_devices()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.managed_devices
  SET status = 'Offline'
  WHERE status = 'Online'
    AND last_seen < now() - interval '90 seconds';
$$;

-- Enable pg_cron and pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule sweep every minute
SELECT cron.schedule(
  'detect-offline-devices-every-minute',
  '* * * * *',
  $$ SELECT public.detect_offline_devices(); $$
);
