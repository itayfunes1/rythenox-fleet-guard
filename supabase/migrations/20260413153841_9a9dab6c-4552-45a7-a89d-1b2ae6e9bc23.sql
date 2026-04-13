
-- Chat channels table
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text,
  type text NOT NULL DEFAULT 'channel',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Chat channel members table
CREATE TABLE public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

-- Add channel_id to team_chat_messages
ALTER TABLE public.team_chat_messages
  ADD COLUMN channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE;

-- RLS: chat_channels
CREATE POLICY "Members can view their channels"
  ON public.chat_channels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channel_members ccm
      WHERE ccm.channel_id = chat_channels.id AND ccm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create channels in their tenant"
  ON public.chat_channels FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Creators can delete their channels"
  ON public.chat_channels FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- RLS: chat_channel_members
CREATE POLICY "Members can view channel members"
  ON public.chat_channel_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channel_members ccm2
      WHERE ccm2.channel_id = chat_channel_members.channel_id AND ccm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can add to channels they belong to"
  ON public.chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_channel_members ccm2
      WHERE ccm2.channel_id = chat_channel_members.channel_id AND ccm2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_channels cc
      WHERE cc.id = chat_channel_members.channel_id AND cc.created_by = auth.uid()
    )
  );

CREATE POLICY "Members can leave channels"
  ON public.chat_channel_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Update team_chat_messages policies to also check channel membership
CREATE POLICY "Members can view channel messages"
  ON public.team_chat_messages FOR SELECT TO authenticated
  USING (
    channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_channel_members ccm
      WHERE ccm.channel_id = team_chat_messages.channel_id AND ccm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send channel messages"
  ON public.team_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    channel_id IS NOT NULL
    AND user_id = auth.uid()
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.chat_channel_members ccm
      WHERE ccm.channel_id = team_chat_messages.channel_id AND ccm.user_id = auth.uid()
    )
  );

-- Allow tenant members to see each other (for member picker)
CREATE POLICY "Members can view tenant members"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Function to auto-create General channel for new tenants
CREATE OR REPLACE FUNCTION public.create_default_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  channel_id uuid;
  member_email text;
BEGIN
  -- Create General channel
  INSERT INTO public.chat_channels (tenant_id, name, type, created_by)
  VALUES (NEW.tenant_id, 'General', 'channel', NEW.user_id)
  RETURNING id INTO channel_id;

  -- Get user email
  SELECT email INTO member_email FROM auth.users WHERE id = NEW.user_id;

  -- Add creator as member
  INSERT INTO public.chat_channel_members (channel_id, user_id, user_email)
  VALUES (channel_id, NEW.user_id, COALESCE(member_email, 'unknown'));

  RETURN NEW;
END;
$$;

-- Trigger on tenant_members insert (when a new tenant is created, owner is added)
CREATE TRIGGER on_tenant_member_create_default_channel
  AFTER INSERT ON public.tenant_members
  FOR EACH ROW
  WHEN (NEW.role = 'owner')
  EXECUTE FUNCTION public.create_default_channel();
