alter table public.family_memberships
add column if not exists phone_number text;

alter table public.family_memberships
add column if not exists whatsapp_opt_in boolean not null default false;

insert into storage.buckets (id, name, public)
values ('kitchen-images', 'kitchen-images', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can read own receipt files'
  ) then
    create policy "authenticated users can read own receipt files"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can upload own receipt files'
  ) then
    create policy "authenticated users can upload own receipt files"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can update own receipt files'
  ) then
    create policy "authenticated users can update own receipt files"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can delete own receipt files'
  ) then
    create policy "authenticated users can delete own receipt files"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can read own kitchen files'
  ) then
    create policy "authenticated users can read own kitchen files"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can upload own kitchen files'
  ) then
    create policy "authenticated users can upload own kitchen files"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can update own kitchen files'
  ) then
    create policy "authenticated users can update own kitchen files"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated users can delete own kitchen files'
  ) then
    create policy "authenticated users can delete own kitchen files"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'kitchen-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

