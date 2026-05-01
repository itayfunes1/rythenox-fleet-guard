
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS direct_messages boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.notify_dm_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_dm_channel boolean;
  recipient record;
  author_email text;
  preview text;
BEGIN
  SELECT is_dm INTO is_dm_channel FROM public.chat_channels WHERE id = NEW.channel_id;
  IF NOT COALESCE(is_dm_channel, false) THEN
    RETURN NEW;
  END IF;

  SELECT email INTO author_email FROM auth.users WHERE id = NEW.author_id;
  preview := left(NEW.body, 140);

  FOR recipient IN
    SELECT user_id FROM public.chat_channel_members
    WHERE channel_id = NEW.channel_id AND user_id <> NEW.author_id
  LOOP
    PERFORM public.notify_user(
      NEW.tenant_id,
      recipient.user_id,
      'direct_messages',
      'New message from ' || COALESCE(author_email, 'a teammate'),
      preview,
      'info'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dm_message ON public.chat_messages;
CREATE TRIGGER trg_notify_dm_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dm_message();
