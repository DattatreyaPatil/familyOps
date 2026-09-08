create extension if not exists vector with schema extensions;

alter table public.profiles
  add column if not exists runs_cold boolean not null default false;

create table if not exists public.family_weather_settings (
  family_id uuid primary key references public.families(id) on delete cascade,
  location_name text,
  latitude double precision,
  longitude double precision,
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table if not exists public.video_library_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  url text not null,
  platform text not null check (platform in ('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'OTHER')),
  title text not null,
  summary text not null default '',
  transcript text not null default '',
  topics text[] not null default '{}',
  content_type text not null default 'Other',
  status text not null default 'READY' check (status in ('READY', 'NEEDS_PROVIDER', 'FAILED')),
  error_message text,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, url)
);

create index if not exists video_library_family_created_idx
  on public.video_library_items (family_id, created_at desc);
create index if not exists video_library_embedding_idx
  on public.video_library_items using hnsw (embedding extensions.vector_cosine_ops);

alter table public.family_weather_settings enable row level security;
alter table public.video_library_items enable row level security;

create policy "members can manage weather settings"
on public.family_weather_settings for all
to authenticated
using ((select public.user_can_access_family(family_id)))
with check ((select public.user_can_access_family(family_id)));

create policy "members can manage video library"
on public.video_library_items for all
to authenticated
using ((select public.user_can_access_family(family_id)))
with check ((select public.user_can_access_family(family_id)));

create or replace function public.match_family_videos(
  p_family_id uuid,
  p_embedding extensions.vector(768),
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
  order by item.embedding <=> p_embedding
  limit least(greatest(p_match_count, 1), 50);
$$;

revoke all on function public.match_family_videos(uuid, extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.match_family_videos(uuid, extensions.vector, integer) to service_role;

drop trigger if exists set_video_library_updated_at on public.video_library_items;
create trigger set_video_library_updated_at
before update on public.video_library_items
for each row execute function public.set_updated_at();
