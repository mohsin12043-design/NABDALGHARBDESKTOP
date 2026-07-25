-- Nabd Al-Gharb Desktop HR modules setup
-- Run in Supabase SQL Editor only if these tables do not already exist.

create extension if not exists pgcrypto;

create table if not exists public.nag_employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text unique,
  name text not null,
  mobile text,
  id_number text,
  nationality text,
  job_title text,
  join_date date,
  basic_salary numeric(14,2) default 0,
  status text default 'Active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nag_salary_slips (
  id uuid primary key default gen_random_uuid(),
  slip_no text unique not null,
  employee_id uuid,
  employee_name text not null,
  salary_month text,
  slip_date date default current_date,
  basic_salary numeric(14,2) default 0,
  allowances numeric(14,2) default 0,
  deductions numeric(14,2) default 0,
  advance_deduction numeric(14,2) default 0,
  net_salary numeric(14,2) default 0,
  payment_method text,
  expense_ref text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nag_advance_slips (
  id uuid primary key default gen_random_uuid(),
  slip_no text unique not null,
  employee_id uuid,
  employee_name text not null,
  slip_date date default current_date,
  amount numeric(14,2) default 0,
  payment_method text,
  reason text,
  expense_ref text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.nag_employees enable row level security;
alter table public.nag_salary_slips enable row level security;
alter table public.nag_advance_slips enable row level security;

do $$ begin
  create policy "nag_employees_full_access" on public.nag_employees for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "nag_salary_slips_full_access" on public.nag_salary_slips for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "nag_advance_slips_full_access" on public.nag_advance_slips for all using (true) with check (true);
exception when duplicate_object then null; end $$;
