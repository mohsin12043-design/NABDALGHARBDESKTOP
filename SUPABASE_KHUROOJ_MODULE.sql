-- Nabd Al-Gharb Desktop Khurooj module
-- Run once in Supabase SQL Editor before opening the Khurooj screen.

begin;

create extension if not exists pgcrypto;

-- Keep the existing employee table and add the fields required by Khurooj.
create table if not exists public.nag_employees (
  id uuid primary key default gen_random_uuid(),
  emp_code text unique,
  name_en text,
  name_ar text,
  designation text,
  department text,
  basic_salary numeric(14,2) default 0,
  phone text,
  iqama_no text,
  iqama_expiry date,
  passport_no text,
  passport_expiry date,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.nag_employees add column if not exists emp_code text;
alter table public.nag_employees add column if not exists name_en text;
alter table public.nag_employees add column if not exists name_ar text;
alter table public.nag_employees add column if not exists designation text;
alter table public.nag_employees add column if not exists department text;
alter table public.nag_employees add column if not exists basic_salary numeric(14,2) default 0;
alter table public.nag_employees add column if not exists phone text;
alter table public.nag_employees add column if not exists iqama_no text;
alter table public.nag_employees add column if not exists iqama_expiry date;
alter table public.nag_employees add column if not exists passport_no text;
alter table public.nag_employees add column if not exists passport_expiry date;
alter table public.nag_employees add column if not exists status text default 'active';
alter table public.nag_employees add column if not exists created_at timestamptz default now();
alter table public.nag_employees add column if not exists updated_at timestamptz default now();

create unique index if not exists nag_employees_emp_code_unique
  on public.nag_employees(emp_code)
  where emp_code is not null;

create table if not exists public.nag_khurooj (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.nag_employees(id) on delete set null,
  employee_code text,
  employee_name text not null,
  exit_type text not null default 'exit_reentry',
  exit_date date not null,
  return_date date,
  return_airport text,
  exit_visa_expiry date,
  returned_at date,
  status text default 'active',
  remarks text,
  attachment_url text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists nag_khurooj_employee_id_idx on public.nag_khurooj(employee_id);
create index if not exists nag_khurooj_return_date_idx on public.nag_khurooj(return_date);
create index if not exists nag_khurooj_exit_date_idx on public.nag_khurooj(exit_date);

alter table public.nag_employees enable row level security;
alter table public.nag_khurooj enable row level security;

do $$ begin
  create policy "nag_employees_full_access" on public.nag_employees
  for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "nag_khurooj_full_access" on public.nag_khurooj
  for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Realtime synchronization for all computers.
do $$ begin
  alter publication supabase_realtime add table public.nag_employees;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.nag_khurooj;
exception when duplicate_object then null; end $$;

commit;
