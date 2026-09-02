create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.user_can_access_family(uuid) from public;

drop policy if exists "owners can create families" on public.families;
create policy "owners can create families"
on public.families for insert
with check (owner_user_id = (select auth.uid()));
