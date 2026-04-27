-- =====================================================
-- SAVED COMMANDS
-- =====================================================
CREATE TABLE public.saved_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  command text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tenant saved commands"
  ON public.saved_commands FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members create tenant saved commands"
  ON public.saved_commands FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Members update tenant saved commands"
  ON public.saved_commands FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members delete tenant saved commands"
  ON public.saved_commands FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_saved_commands_updated
  BEFORE UPDATE ON public.saved_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_commands_tenant ON public.saved_commands(tenant_id);

-- =====================================================
-- PLAYBOOKS
-- =====================================================
CREATE TABLE public.playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tenant playbooks"
  ON public.playbooks FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members create tenant playbooks"
  ON public.playbooks FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Members update tenant playbooks"
  ON public.playbooks FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members delete tenant playbooks"
  ON public.playbooks FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_playbooks_updated
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_playbooks_tenant ON public.playbooks(tenant_id);

-- =====================================================
-- SCHEDULED TASKS
-- =====================================================
CREATE TABLE public.scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  command text NOT NULL,
  target_ids text[] NOT NULL DEFAULT '{}',
  cron_expression text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tenant schedules"
  ON public.scheduled_tasks FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members create tenant schedules"
  ON public.scheduled_tasks FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Members update tenant schedules"
  ON public.scheduled_tasks FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members delete tenant schedules"
  ON public.scheduled_tasks FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_scheduled_tasks_updated
  BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scheduled_tasks_tenant ON public.scheduled_tasks(tenant_id);
CREATE INDEX idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run_at) WHERE enabled = true;

-- =====================================================
-- AUDIT LOG (immutable)
-- =====================================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tenant audit log"
  ON public.audit_log FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Members insert tenant audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE INDEX idx_audit_log_tenant_created ON public.audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- =====================================================
-- AUDIT HELPER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _tenant_id uuid,
  _actor_id uuid,
  _action text,
  _entity_type text,
  _entity_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_email_val text;
BEGIN
  IF _actor_id IS NOT NULL THEN
    SELECT email INTO actor_email_val FROM auth.users WHERE id = _actor_id;
  END IF;

  INSERT INTO public.audit_log (tenant_id, actor_id, actor_email, action, entity_type, entity_id, metadata)
  VALUES (_tenant_id, _actor_id, actor_email_val, _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- =====================================================
-- AUTO-AUDIT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_remote_task_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    NEW.tenant_id, auth.uid(),
    'task.created', 'remote_task', NEW.id::text,
    jsonb_build_object('target_id', NEW.target_id, 'command', left(NEW.command, 200))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_remote_task_insert
  AFTER INSERT ON public.remote_tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_remote_task_insert();

CREATE OR REPLACE FUNCTION public.audit_build_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    NEW.tenant_id, NEW.user_id,
    'build.created', 'build', NEW.build_id,
    jsonb_build_object('status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_build_insert
  AFTER INSERT ON public.build_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_build_insert();

CREATE OR REPLACE FUNCTION public.audit_announcement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    NEW.tenant_id, NEW.user_id,
    'announcement.created', 'announcement', NEW.id::text,
    jsonb_build_object('title', NEW.title, 'type', NEW.type)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_announcement_insert
  AFTER INSERT ON public.server_announcements
  FOR EACH ROW EXECUTE FUNCTION public.audit_announcement_insert();