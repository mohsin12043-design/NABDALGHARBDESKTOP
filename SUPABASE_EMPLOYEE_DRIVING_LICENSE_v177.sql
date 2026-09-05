-- Nabd Al-Gharb Desktop v1.7.7
-- Employee document fields migration
-- Run once in Supabase SQL Editor.

begin;

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
alter table public.nag_employees add column if not exists driving_license_no text;
alter table public.nag_employees add column if not exists driving_license_expiry date;
alter table public.nag_employees add column if not exists status text default 'active';
alter table public.nag_employees add column if not exists updated_at timestamptz default now();

commit;

-- Refresh PostgREST schema cache so the new fields are immediately available.
notify pgrst, 'reload schema';

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='nag_employees' and column_name='department') as department_ready,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='nag_employees' and column_name='driving_license_no') as license_number_ready,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='nag_employees' and column_name='driving_license_expiry') as license_expiry_ready;
