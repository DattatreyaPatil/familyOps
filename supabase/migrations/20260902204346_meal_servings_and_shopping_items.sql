alter table public.meal_plans
  add column if not exists servings_adults integer not null default 2 check (servings_adults >= 0),
  add column if not exists servings_kids integer not null default 0 check (servings_kids >= 0),
  add column if not exists shopping_items jsonb not null default '[]'::jsonb;

update public.meal_plans
set shopping_items = '[]'::jsonb
where shopping_items is null;
