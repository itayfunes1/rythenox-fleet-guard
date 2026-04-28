-- Enable extensions for cron-driven HTTP calls
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any prior schedule with the same name
do $$
begin
  if exists (select 1 from cron.job where jobname = 'dispatch-schedules-every-minute') then
    perform cron.unschedule('dispatch-schedules-every-minute');
  end if;
end$$;

-- Fire the dispatch-schedules edge function once per minute
select cron.schedule(
  'dispatch-schedules-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://prodlnwtjkomsstrufqr.supabase.co/functions/v1/dispatch-schedules',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2Rsbnd0amtvbXNzdHJ1ZnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzE3NjIsImV4cCI6MjA5MTMwNzc2Mn0.J1DCK9gk_LbgluTWochLR154Geqfwj-hnXLzyCmQp4Y"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);