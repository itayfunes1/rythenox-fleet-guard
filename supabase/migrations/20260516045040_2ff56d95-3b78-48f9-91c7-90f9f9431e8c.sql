update public.build_history bh
set status = 'ready', completed_at = coalesce(bh.completed_at, so.created_at)
from storage.objects so
where so.bucket_id = 'builds'
  and so.name = bh.build_id || '.exe'
  and bh.status = 'building';