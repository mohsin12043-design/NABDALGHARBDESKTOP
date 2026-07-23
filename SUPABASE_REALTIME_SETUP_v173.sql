-- Nabd Al-Gharb Desktop v1.7.3
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create table if not exists public.app_data (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

-- Current desktop application uses a publishable key without Supabase Auth.
-- This policy is required for that design. Do not expose the project URL/key outside the app.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_data'
      and policyname = 'Nabd desktop app_data read'
  ) then
    create policy "Nabd desktop app_data read"
      on public.app_data for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_data'
      and policyname = 'Nabd desktop app_data insert'
  ) then
    create policy "Nabd desktop app_data insert"
      on public.app_data for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_data'
      and policyname = 'Nabd desktop app_data update'
  ) then
    create policy "Nabd desktop app_data update"
      on public.app_data for update
      to anon
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_data'
      and policyname = 'Nabd desktop app_data delete'
  ) then
    create policy "Nabd desktop app_data delete"
      on public.app_data for delete
      to anon
      using (true);
  end if;
end $$;

alter table public.app_data replica identity full;

-- Add app_data to Supabase Realtime publication when it is not already included.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_data'
  ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end $$;

create index if not exists app_data_updated_at_idx
  on public.app_data (updated_at desc);

-- Connection marker used to verify that SQL setup completed.
insert into public.app_data (key, value, updated_at)
values ('nag_supabase_setup_v173', 'ready', now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;
