
-- ============================================================
-- Phase 2 Messages: reactions, edit/delete, pins, threads, search, attachments
-- ============================================================

-- 1) chat_messages: new columns
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid;

-- Full-text search column
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS body_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(body,''))) STORED;

CREATE INDEX IF NOT EXISTS idx_chat_messages_body_tsv ON public.chat_messages USING gin(body_tsv);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_parent_created
  ON public.chat_messages(channel_id, parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
  ON public.chat_messages(channel_id) WHERE pinned_at IS NOT NULL;

-- 2) Trigger: bump edited_at on body change
CREATE OR REPLACE FUNCTION public.bump_chat_message_edited_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_chat_message_edited_at ON public.chat_messages;
CREATE TRIGGER trg_bump_chat_message_edited_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_chat_message_edited_at();

-- 3) Trigger: maintain reply_count on parent + notify parent author
CREATE OR REPLACE FUNCTION public.maintain_thread_reply_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_author uuid;
  parent_tenant uuid;
  channel_label text;
  author_email text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.chat_messages
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_id;

      -- Notify parent author (skip self-replies)
      SELECT author_id, tenant_id INTO parent_author, parent_tenant
        FROM public.chat_messages WHERE id = NEW.parent_id;

      IF parent_author IS NOT NULL AND parent_author <> NEW.author_id THEN
        SELECT name INTO channel_label FROM public.chat_channels WHERE id = NEW.channel_id;
        SELECT email INTO author_email FROM auth.users WHERE id = NEW.author_id;

        PERFORM public.notify_user(
          parent_tenant, parent_author, 'thread_replies',
          'New reply in #' || COALESCE(channel_label, 'thread'),
          COALESCE(author_email, 'Someone') || ': ' || left(NEW.body, 140),
          'info'
        );
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- soft delete: decrement
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NEW.parent_id IS NOT NULL THEN
      UPDATE public.chat_messages
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = NEW.parent_id;
    -- undelete: increment
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND NEW.parent_id IS NOT NULL THEN
      UPDATE public.chat_messages
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE public.chat_messages
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = OLD.parent_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_thread_reply_count_ins ON public.chat_messages;
CREATE TRIGGER trg_thread_reply_count_ins
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.maintain_thread_reply_count();

DROP TRIGGER IF EXISTS trg_thread_reply_count_upd ON public.chat_messages;
CREATE TRIGGER trg_thread_reply_count_upd
  AFTER UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.maintain_thread_reply_count();

DROP TRIGGER IF EXISTS trg_thread_reply_count_del ON public.chat_messages;
CREATE TRIGGER trg_thread_reply_count_del
  AFTER DELETE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.maintain_thread_reply_count();

-- 4) Reactions table
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON public.chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_channel ON public.chat_message_reactions(channel_id);

CREATE POLICY "View reactions in your channels"
  ON public.chat_message_reactions FOR SELECT
  USING (public.is_chat_channel_member(channel_id, auth.uid()));

CREATE POLICY "Add own reactions in your channels"
  ON public.chat_message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_chat_channel_member(channel_id, auth.uid())
  );

CREATE POLICY "Delete own reactions"
  ON public.chat_message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- 5) Attachments table
CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  uploader_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL DEFAULT 0,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON public.chat_message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_channel ON public.chat_message_attachments(channel_id);

CREATE POLICY "View attachments in your channels"
  ON public.chat_message_attachments FOR SELECT
  USING (public.is_chat_channel_member(channel_id, auth.uid()));

CREATE POLICY "Upload attachments in your channels"
  ON public.chat_message_attachments FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_chat_channel_member(channel_id, auth.uid())
  );

CREATE POLICY "Delete own attachments or admin"
  ON public.chat_message_attachments FOR DELETE
  USING (uploader_id = auth.uid() OR public.is_tenant_admin(tenant_id, auth.uid()));

-- 6) Pin / unpin RPCs (admin only)
CREATE OR REPLACE FUNCTION public.pin_chat_message(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO msg FROM public.chat_messages WHERE id = _message_id;
  IF msg.id IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF NOT public.is_tenant_admin(msg.tenant_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can pin messages';
  END IF;
  UPDATE public.chat_messages
    SET pinned_at = now(), pinned_by = auth.uid()
    WHERE id = _message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_chat_message(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO msg FROM public.chat_messages WHERE id = _message_id;
  IF msg.id IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF NOT public.is_tenant_admin(msg.tenant_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can unpin messages';
  END IF;
  UPDATE public.chat_messages
    SET pinned_at = NULL, pinned_by = NULL
    WHERE id = _message_id;
END;
$$;

-- 7) Search RPC
CREATE OR REPLACE FUNCTION public.search_chat_messages(_query text, _channel_id uuid DEFAULT NULL, _limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  channel_id uuid,
  channel_name text,
  is_dm boolean,
  author_id uuid,
  author_email text,
  body text,
  parent_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  q := trim(coalesce(_query, ''));
  IF length(q) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT m.id, m.channel_id, c.name AS channel_name, c.is_dm,
         m.author_id, u.email::text AS author_email,
         m.body, m.parent_id, m.created_at
  FROM public.chat_messages m
  JOIN public.chat_channels c ON c.id = m.channel_id
  LEFT JOIN auth.users u ON u.id = m.author_id
  WHERE m.deleted_at IS NULL
    AND public.is_chat_channel_member(m.channel_id, auth.uid())
    AND (_channel_id IS NULL OR m.channel_id = _channel_id)
    AND (m.body_tsv @@ plainto_tsquery('simple', q) OR m.body ILIKE '%' || q || '%')
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200);
END;
$$;

-- 8) Notification preference for thread replies
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS thread_replies boolean NOT NULL DEFAULT true;

-- 9) Storage bucket + policies for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Path layout: {tenant_id}/{channel_id}/{message_id}/{filename}
DROP POLICY IF EXISTS "Chat attach: read members" ON storage.objects;
CREATE POLICY "Chat attach: read members"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1]::uuid = public.get_user_tenant_id(auth.uid())
    AND public.is_chat_channel_member(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "Chat attach: upload members" ON storage.objects;
CREATE POLICY "Chat attach: upload members"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1]::uuid = public.get_user_tenant_id(auth.uid())
    AND public.is_chat_channel_member(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "Chat attach: delete own or admin" ON storage.objects;
CREATE POLICY "Chat attach: delete own or admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND (
      owner = auth.uid()
      OR public.is_tenant_admin((storage.foldername(name))[1]::uuid, auth.uid())
    )
  );
