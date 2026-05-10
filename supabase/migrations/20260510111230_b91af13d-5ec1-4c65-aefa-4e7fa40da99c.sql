DROP POLICY IF EXISTS "Admins view platform admins" ON public.platform_admins;

CREATE POLICY "Platform admins can read own admin grant"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

INSERT INTO public.platform_admins (user_id, note)
VALUES ('4af6bbd6-5fe5-464b-9093-bc4c1bc3bd40', 'monitor@rythenox.com')
ON CONFLICT (user_id) DO UPDATE
SET note = COALESCE(public.platform_admins.note, EXCLUDED.note);