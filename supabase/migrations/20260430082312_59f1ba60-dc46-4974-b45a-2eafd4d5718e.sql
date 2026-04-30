-- =========================================================
-- TEAM CHAT
-- =========================================================

CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_dm boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_channels_tenant_idx ON public.chat_channels(tenant_id);

CREATE TABLE public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);
CREATE INDEX chat_members_user_idx ON public.chat_channel_members(user_id);
CREATE INDEX chat_members_channel_idx ON public.chat_channel_members(channel_id);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_channel_idx ON public.chat_messages(channel_id, created_at DESC);

CREATE TABLE public.chat_typing (
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Security-definer helpers (avoid RLS recursion)
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_chat_channel_member(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_channel_tenant(_channel_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.chat_channels WHERE id = _channel_id;
$$;

-- =========================================================
-- RLS POLICIES: channels
-- =========================================================

CREATE POLICY "View channels you belong to"
  ON public.chat_channels FOR SELECT
  USING (public.is_chat_channel_member(id, auth.uid()));

CREATE POLICY "Admins create non-DM channels; anyone creates DMs"
  ON public.chat_channels FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
    AND (
      is_dm = true
      OR public.is_tenant_admin(tenant_id, auth.uid())
    )
  );

CREATE POLICY "Admins update channels"
  ON public.chat_channels FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_tenant_admin(tenant_id, auth.uid())
  );

CREATE POLICY "Admins delete channels"
  ON public.chat_channels FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_tenant_admin(tenant_id, auth.uid())
  );

-- =========================================================
-- RLS POLICIES: channel members
-- =========================================================

CREATE POLICY "View own membership rows"
  ON public.chat_channel_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_chat_channel_member(channel_id, auth.uid())
  );

CREATE POLICY "Insert members in your tenant"
  ON public.chat_channel_members FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Update own membership (last_read)"
  ON public.chat_channel_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Leave channels (delete own membership)"
  ON public.chat_channel_members FOR DELETE
  USING (user_id = auth.uid() OR public.is_tenant_admin(tenant_id, auth.uid()));

-- =========================================================
-- RLS POLICIES: messages
-- =========================================================

CREATE POLICY "View messages in your channels"
  ON public.chat_messages FOR SELECT
  USING (public.is_chat_channel_member(channel_id, auth.uid()));

CREATE POLICY "Post messages in your channels"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_chat_channel_member(channel_id, auth.uid())
  );

CREATE POLICY "Edit own messages"
  ON public.chat_messages FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Delete own or admin"
  ON public.chat_messages FOR DELETE
  USING (
    author_id = auth.uid()
    OR public.is_tenant_admin(tenant_id, auth.uid())
  );

-- =========================================================
-- RLS POLICIES: typing
-- =========================================================

CREATE POLICY "View typing in your channels"
  ON public.chat_typing FOR SELECT
  USING (public.is_chat_channel_member(channel_id, auth.uid()));

CREATE POLICY "Upsert own typing"
  ON public.chat_typing FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_chat_channel_member(channel_id, auth.uid())
  );

CREATE POLICY "Update own typing"
  ON public.chat_typing FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Delete own typing"
  ON public.chat_typing FOR DELETE
  USING (user_id = auth.uid());

-- =========================================================
-- Triggers
-- =========================================================

CREATE TRIGGER chat_channels_updated_at
  BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify mentioned users
CREATE OR REPLACE FUNCTION public.notify_chat_mentions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  mentioned uuid;
  channel_label text;
  author_email text;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO channel_label FROM public.chat_channels WHERE id = NEW.channel_id;
  SELECT email INTO author_email FROM auth.users WHERE id = NEW.author_id;

  FOREACH mentioned IN ARRAY NEW.mentions LOOP
    IF mentioned <> NEW.author_id THEN
      PERFORM public.notify_user(
        NEW.tenant_id, mentioned, 'announcements',
        'Mentioned in #' || COALESCE(channel_label, 'chat'),
        COALESCE(author_email, 'Someone') || ': ' || left(NEW.body, 140),
        'info'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_mentions
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_mentions();

-- =========================================================
-- RPC: ensure DM channel between two users
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  my_tenant uuid;
  other_tenant uuid;
  existing uuid;
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF me = _other_user THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;

  my_tenant := public.get_user_tenant_id(me);
  other_tenant := public.get_user_tenant_id(_other_user);

  IF my_tenant IS NULL OR my_tenant <> other_tenant THEN
    RAISE EXCEPTION 'User is not in your organization';
  END IF;

  -- Find existing DM with exactly these two members
  SELECT c.id INTO existing
  FROM public.chat_channels c
  WHERE c.is_dm = true
    AND c.tenant_id = my_tenant
    AND EXISTS (SELECT 1 FROM public.chat_channel_members m WHERE m.channel_id = c.id AND m.user_id = me)
    AND EXISTS (SELECT 1 FROM public.chat_channel_members m WHERE m.channel_id = c.id AND m.user_id = _other_user)
    AND (SELECT count(*) FROM public.chat_channel_members m WHERE m.channel_id = c.id) = 2
  LIMIT 1;

  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.chat_channels (tenant_id, name, is_dm, created_by)
  VALUES (my_tenant, 'dm', true, me)
  RETURNING id INTO new_id;

  INSERT INTO public.chat_channel_members (channel_id, user_id, tenant_id)
  VALUES (new_id, me, my_tenant), (new_id, _other_user, my_tenant);

  RETURN new_id;
END;
$$;

-- =========================================================
-- RPC: list org members with display info (for DM picker / mentions)
-- =========================================================

CREATE OR REPLACE FUNCTION public.list_tenant_members()
RETURNS TABLE(user_id uuid, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tm.user_id, u.email::text, tm.role
  FROM public.tenant_members tm
  JOIN auth.users u ON u.id = tm.user_id
  WHERE tm.tenant_id = public.get_user_tenant_id(auth.uid())
  ORDER BY u.email ASC;
$$;

-- =========================================================
-- RPC: auto-join all org members to a non-DM channel
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_team_channel(_name text, _description text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  my_tenant uuid;
  new_id uuid;
  cleaned text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  my_tenant := public.get_user_tenant_id(me);
  IF NOT public.is_tenant_admin(my_tenant, me) THEN
    RAISE EXCEPTION 'Only owners and admins can create channels';
  END IF;

  cleaned := lower(regexp_replace(trim(COALESCE(_name,'')), '[^a-z0-9-]+', '-', 'g'));
  IF length(cleaned) < 2 THEN RAISE EXCEPTION 'Channel name too short'; END IF;

  INSERT INTO public.chat_channels (tenant_id, name, description, is_dm, created_by)
  VALUES (my_tenant, cleaned, NULLIF(trim(COALESCE(_description,'')),''), false, me)
  RETURNING id INTO new_id;

  INSERT INTO public.chat_channel_members (channel_id, user_id, tenant_id)
  SELECT new_id, tm.user_id, my_tenant
  FROM public.tenant_members tm WHERE tm.tenant_id = my_tenant;

  RETURN new_id;
END;
$$;

-- =========================================================
-- Realtime
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;