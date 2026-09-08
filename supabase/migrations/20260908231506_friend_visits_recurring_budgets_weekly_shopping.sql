create table public.friend_visits (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  friend_id uuid not null references public.friends(id) on delete cascade,
  visited_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index friend_visits_family_date_idx
  on public.friend_visits (family_id, visited_at desc);
create index friend_visits_friend_date_idx
  on public.friend_visits (friend_id, visited_at desc);

create table public.recurring_budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category public.expense_category not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, category)
);

create table public.weekly_shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_start date not null,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, week_start)
);

alter table public.meal_plans
  add column if not exists ingredients_used text[] not null default '{}';

alter table public.friend_visits enable row level security;
alter table public.recurring_budgets enable row level security;
alter table public.weekly_shopping_lists enable row level security;

create policy "members can manage friend visits"
on public.friend_visits for all
to authenticated
using ((select public.user_can_access_family(family_id)))
with check (
  (select public.user_can_access_family(family_id))
  and exists (
    select 1 from public.friends friend
    where friend.id = friend_visits.friend_id
      and friend.family_id = friend_visits.family_id
  )
);

create policy "members can manage recurring budgets"
on public.recurring_budgets for all
to authenticated
using ((select public.user_can_access_family(family_id)))
with check ((select public.user_can_access_family(family_id)));

create policy "members can manage weekly shopping lists"
on public.weekly_shopping_lists for all
to authenticated
using ((select public.user_can_access_family(family_id)))
with check ((select public.user_can_access_family(family_id)));

grant select, insert, update, delete on public.friend_visits to authenticated;
grant select, insert, update, delete on public.recurring_budgets to authenticated;
grant select, insert, update, delete on public.weekly_shopping_lists to authenticated;

create trigger set_friend_visits_updated_at
before update on public.friend_visits
for each row execute function public.set_updated_at();

create trigger set_recurring_budgets_updated_at
before update on public.recurring_budgets
for each row execute function public.set_updated_at();

create trigger set_weekly_shopping_lists_updated_at
before update on public.weekly_shopping_lists
for each row execute function public.set_updated_at();

insert into public.friend_visits (family_id, friend_id, visited_at, notes)
select family_id, id, last_met_at, 'Imported from previous last-met date'
from public.friends
where last_met_at is not null;

insert into public.recurring_budgets (family_id, category, amount)
select distinct on (family_id, category) family_id, category, amount
from public.monthly_budgets
order by family_id, category, month desc
on conflict (family_id, category) do nothing;
