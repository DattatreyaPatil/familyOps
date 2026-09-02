alter table public.meal_plans
  add column if not exists meal_type text not null default 'LUNCH',
  add column if not exists audience text not null default 'family',
  add column if not exists calories integer not null default 0 check (calories >= 0),
  add column if not exists protein_grams integer not null default 0 check (protein_grams >= 0),
  add column if not exists cuisine text not null default 'Mixed',
  add column if not exists source text not null default 'picked',
  add column if not exists notes text;

create index if not exists meal_plans_family_date_idx on public.meal_plans (family_id, date);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  notes text,
  last_met_at timestamptz,
  preferred_gap_weeks integer not null default 7 check (preferred_gap_weeks > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists friends_family_active_sort_idx on public.friends (family_id, is_active, sort_order, created_at);
create index if not exists friends_family_last_met_idx on public.friends (family_id, last_met_at);

alter table public.friends enable row level security;

drop policy if exists "members can manage friends" on public.friends;
create policy "members can manage friends"
on public.friends for all
using (public.user_can_access_family(family_id))
with check (public.user_can_access_family(family_id));

drop trigger if exists set_friends_updated_at on public.friends;
create trigger set_friends_updated_at
before update on public.friends
for each row
execute function public.set_updated_at();
