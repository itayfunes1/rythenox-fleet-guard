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
  author_name text;
  preview text;
BEGIN
  SELECT is_dm INTO is_dm_channel FROM public.chat_channels WHERE id = NEW.channel_id;
  IF NOT COALESCE(is_dm_channel, false) THEN
    RETURN NEW;
  END IF;

  SELECT email INTO author_email FROM auth.users WHERE id = NEW.author_id;
  -- Use the local-part of the email as a friendly display name (no profiles table available)
  author_name := COALESCE(split_part(author_email, '@', 1), 'a teammate');
  preview := left(NEW.body, 140);

  FOR recipient IN
    SELECT user_id FROM public.chat_channel_members
    WHERE channel_id = NEW.channel_id AND user_id <> NEW.author_id
  LOOP
    PERFORM public.notify_user(
      NEW.tenant_id,
      recipient.user_id,
      'direct_messages',
      'New message from ' || author_name,
      preview,
      'info'
    );
  END LOOP;

  RETURN NEW;
END;
$$;