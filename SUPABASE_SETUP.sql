-- Nabd Al-Gharb app_data cloud sync table
-- Run once in Supabase SQL Editor if app_data table does not already exist.
create table if not exists public.app_data (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table public.app_data enable row level security;

-- For private production apps, replace this open policy with authenticated-user policies.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='app_data' and policyname='Allow app_data access') then
    create policy "Allow app_data access" on public.app_data
      for all using (true) with check (true);
  end if;
end $$;
