create extension if not exists "pgcrypto";

create type public.task_status as enum ('BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE');
create type public.expense_category as enum ('FOOD', 'TRIPS', 'UTILITIES', 'KIDS_GEAR', 'GIFTS', 'MISCELLANEOUS', 'MAINTENANCE', 'UNCATEGORIZED');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.family_memberships (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  phone_number text,
  whatsapp_opt_in boolean not null default false,
  primary key (family_id, user_id)
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  full_name text not null,
  initials text not null,
  is_parent boolean not null default false,
  stars integer not null default 0 check (stars >= 0),
  created_at timestamptz not null default now()
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  cron_spec text not null default '30 6 * * *',
  days_of_week text[] not null default '{}'
);

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  assigned_to_id uuid references public.profiles(id) on delete set null,
  title text not null
);

create table public.routine_execution_logs (
  id uuid primary key default gen_random_uuid(),
  routine_item_id uuid not null references public.routine_items(id) on delete cascade,
  completed_at timestamptz not null default now(),
  date_string text not null,
  unique (routine_item_id, date_string)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'TODO',
  due_date timestamptz,
  assigned_to_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  vendor text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  category public.expense_category not null default 'UNCATEGORIZED',
  date timestamptz not null default now(),
  receipt_url text
);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  category public.expense_category not null,
  amount numeric(12,2) not null check (amount >= 0),
  unique (family_id, month, category)
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  date timestamptz not null,
  recipe_title text not null,
  instructions text[] not null default '{}'
);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  is_bought boolean not null default false
);

create table public.star_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create type public.reward_category as enum ('TREAT', 'OUTING', 'TOY', 'SPORT', 'ACTIVITY', 'CUSTOM');
create type public.reward_redemption_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create table public.reward_definitions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  stars_required integer not null check (stars_required > 0),
  category public.reward_category not null default 'CUSTOM',
  icon_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.child_reward_targets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.reward_definitions(id) on delete cascade,
  stars_required integer not null check (stars_required > 0),
  stars_earned integer not null default 0 check (stars_earned >= 0),
  selected_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.reward_definitions(id) on delete cascade,
  stars_spent integer not null check (stars_spent > 0),
  status public.reward_redemption_status not null default 'PENDING',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create or replace function public.user_can_access_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_memberships memberships
    where memberships.family_id = target_family_id
      and memberships.user_id = auth.uid()
  );
$$;

alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.routine_execution_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.meal_plans enable row level security;
alter table public.grocery_items enable row level security;
alter table public.star_ledger enable row level security;
alter table public.reward_definitions enable row level security;
alter table public.child_reward_targets enable row level security;
alter table public.reward_redemptions enable row level security;

create policy "members can read families" on public.families for select using (public.user_can_access_family(id));
create policy "owners can create families" on public.families for insert with check (owner_user_id = auth.uid());
create policy "members can manage memberships" on public.family_memberships for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage profiles" on public.profiles for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage routines" on public.routines for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage routine items" on public.routine_items for all using (
  exists (select 1 from public.routines r where r.id = routine_id and public.user_can_access_family(r.family_id))
) with check (
  exists (select 1 from public.routines r where r.id = routine_id and public.user_can_access_family(r.family_id))
);
create policy "members can manage routine logs" on public.routine_execution_logs for all using (
  exists (
    select 1 from public.routine_items ri
    join public.routines r on r.id = ri.routine_id
    where ri.id = routine_item_id and public.user_can_access_family(r.family_id)
  )
) with check (
  exists (
    select 1 from public.routine_items ri
    join public.routines r on r.id = ri.routine_id
    where ri.id = routine_item_id and public.user_can_access_family(r.family_id)
  )
);
create policy "members can manage tasks" on public.tasks for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage expenses" on public.expenses for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage monthly budgets" on public.monthly_budgets for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage meal plans" on public.meal_plans for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage groceries" on public.grocery_items for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage star ledger" on public.star_ledger for all using (
  exists (select 1 from public.profiles p where p.id = profile_id and public.user_can_access_family(p.family_id))
) with check (
  exists (select 1 from public.profiles p where p.id = profile_id and public.user_can_access_family(p.family_id))
);
create policy "members can manage reward definitions" on public.reward_definitions for all using (public.user_can_access_family(family_id)) with check (public.user_can_access_family(family_id));
create policy "members can manage reward targets" on public.child_reward_targets for all using (
  exists (select 1 from public.profiles p where p.id = profile_id and public.user_can_access_family(p.family_id))
) with check (
  exists (select 1 from public.profiles p where p.id = profile_id and public.user_can_access_family(p.family_id))
);
create policy "members can manage reward redemptions" on public.reward_redemptions for all using (
  exists (select 1 from public.profiles p where p.id = profile_id and public.user_can_access_family(p.family_id))
) with check (
  exists (select 1 from public.profiles p where p.id = profile_id and public.user_can_access_family(p.family_id))
);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('kitchen-images', 'kitchen-images', false)
on conflict (id) do nothing;

create policy "authenticated users can read own receipt files"
on storage.objects for select
to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can upload own receipt files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can update own receipt files"
on storage.objects for update
to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can delete own receipt files"
on storage.objects for delete
to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can read own kitchen files"
on storage.objects for select
to authenticated
using (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can upload own kitchen files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can update own kitchen files"
on storage.objects for update
to authenticated
using (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can delete own kitchen files"
on storage.objects for delete
to authenticated
using (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);
