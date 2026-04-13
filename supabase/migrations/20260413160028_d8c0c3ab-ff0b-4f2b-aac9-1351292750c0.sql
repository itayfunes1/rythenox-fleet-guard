
-- Security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  );
$$;

-- Fix chat_channel_members policies
DROP POLICY IF EXISTS "Members can view channel members" ON public.chat_channel_members;
CREATE POLICY "Members can view channel members" ON public.chat_channel_members
  FOR SELECT TO authenticated
  USING (public.is_channel_member(channel_id, auth.uid()));

DROP POLICY IF EXISTS "Members can add to channels they belong to" ON public.chat_channel_members;
CREATE POLICY "Members can add to channels they belong to" ON public.chat_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_channel_member(channel_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_channels cc WHERE cc.id = channel_id AND cc.created_by = auth.uid())
  );

-- Fix chat_channels SELECT policy
DROP POLICY IF EXISTS "Members can view their channels" ON public.chat_channels;
CREATE POLICY "Members can view their channels" ON public.chat_channels
  FOR SELECT TO authenticated
  USING (
    public.is_channel_member(id, auth.uid())
    OR (type = 'channel' AND tenant_id = public.get_user_tenant_id(auth.uid()))
  );

-- Fix team_chat_messages policies
DROP POLICY IF EXISTS "Members can view channel messages" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Members can view tenant chat" ON public.team_chat_messages;
CREATE POLICY "Members can view channel messages" ON public.team_chat_messages
  FOR SELECT TO authenticated
  USING (
    public.is_channel_member(channel_id, auth.uid())
    OR (channel_id IS NULL AND tenant_id = public.get_user_tenant_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Members can send channel messages" ON public.team_chat_messages;
DROP POLICY IF EXISTS "Members can send chat messages" ON public.team_chat_messages;
CREATE POLICY "Members can send channel messages" ON public.team_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND (channel_id IS NULL OR public.is_channel_member(channel_id, auth.uid()))
  );
