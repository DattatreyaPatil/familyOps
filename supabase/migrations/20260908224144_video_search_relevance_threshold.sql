drop function if exists public.match_family_videos(uuid, extensions.vector, integer);

create function public.match_family_videos(
  p_family_id uuid,
  p_embedding extensions.vector(768),
  p_match_threshold double precision default 0.68,
  p_match_count integer default 20
)
returns table (
  id uuid,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select item.id, 1 - (item.embedding <=> p_embedding) as similarity
  from public.video_library_items item
  where item.family_id = p_family_id
    and item.embedding is not null
    and 1 - (item.embedding <=> p_embedding) >= greatest(least(p_match_threshold, 1), -1)
  order by item.embedding <=> p_embedding
  limit least(greatest(p_match_count, 1), 50);
$$;

revoke all on function public.match_family_videos(uuid, extensions.vector, double precision, integer)
from public, anon, authenticated;
grant execute on function public.match_family_videos(uuid, extensions.vector, double precision, integer)
to service_role;
