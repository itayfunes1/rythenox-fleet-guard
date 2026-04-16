INSERT INTO public.tenant_members (user_id, tenant_id, role)
SELECT 'ef1970b1-5d14-4a39-ae46-c9bad3005911'::uuid, '84b542e5-7c2c-4d24-94ce-be6156d566a6'::uuid, 'member'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tenant_members
  WHERE user_id = 'ef1970b1-5d14-4a39-ae46-c9bad3005911'::uuid
);

INSERT INTO public.chat_channel_members (channel_id, user_id, user_email)
SELECT cc.id, 'ef1970b1-5d14-4a39-ae46-c9bad3005911'::uuid, 'itayfunes@icloud.com'
FROM public.chat_channels cc
WHERE cc.tenant_id = '84b542e5-7c2c-4d24-94ce-be6156d566a6'::uuid
  AND cc.type = 'channel'
  AND EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id = 'ef1970b1-5d14-4a39-ae46-c9bad3005911'::uuid
      AND tm.tenant_id = '84b542e5-7c2c-4d24-94ce-be6156d566a6'::uuid
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.chat_channel_members ccm
    WHERE ccm.channel_id = cc.id
      AND ccm.user_id = 'ef1970b1-5d14-4a39-ae46-c9bad3005911'::uuid
  );