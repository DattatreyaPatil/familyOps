-- Repairs duplicate family rows caused by concurrent first-login bootstrap calls,
-- then enforces one active FamOps family per auth user for the current product model.

with membership_rank as (
  select
    memberships.family_id,
    memberships.user_id,
    row_number() over (
      partition by memberships.user_id
      order by
        (
          select count(*)
          from public.routines routines
          join public.routine_items items on items.routine_id = routines.id
          where routines.family_id = memberships.family_id
        ) desc,
        families.created_at desc,
        memberships.family_id
    ) as rank
  from public.family_memberships memberships
  join public.families families on families.id = memberships.family_id
),
families_to_remove as (
  select family_id
  from membership_rank
  where rank > 1
)
delete from public.families families
using families_to_remove duplicates
where families.id = duplicates.family_id;

create unique index if not exists family_memberships_one_family_per_user_idx
on public.family_memberships (user_id);

create unique index if not exists families_one_owned_family_per_user_idx
on public.families (owner_user_id);

alter table public.routine_items
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists routine_items_routine_id_idx on public.routine_items (routine_id);
create index if not exists routine_items_assigned_to_id_idx on public.routine_items (assigned_to_id);
create index if not exists routine_items_created_by_user_id_idx on public.routine_items (created_by_user_id);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;

drop policy if exists "members can read audit events" on public.audit_events;
create policy "members can read audit events"
on public.audit_events for select
using (public.user_can_access_family(family_id));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_routine_items_updated_at on public.routine_items;
create trigger set_routine_items_updated_at
before update on public.routine_items
for each row
execute function public.set_updated_at();
