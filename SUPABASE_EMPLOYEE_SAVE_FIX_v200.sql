-- Nabd Al-Gharb Desktop v2.0.0
-- Employee save fix and Driving License fields
-- Run once in Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

alter table public.nag_employees add column if not exists employee_no text;
alter table public.nag_employees add column if not exists name text;
alter table public.nag_employees add column if not exists mobile text;
alter table public.nag_employees add column if not exists job_title text;
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

-- Keep old HR fields and the newer Employee module fields compatible.
update public.nag_employees
set
  emp_code = coalesce(nullif(btrim(emp_code),''), nullif(btrim(employee_no),'')),
  employee_no = coalesce(nullif(btrim(employee_no),''), nullif(btrim(emp_code),'')),
  name_en = coalesce(nullif(btrim(name_en),''), nullif(btrim(name),'')),
  name = coalesce(nullif(btrim(name),''), nullif(btrim(name_en),''), nullif(btrim(name_ar),''), nullif(btrim(emp_code),''), 'Employee'),
  designation = coalesce(nullif(btrim(designation),''), nullif(btrim(job_title),'')),
  job_title = coalesce(nullif(btrim(job_title),''), nullif(btrim(designation),'')),
  phone = coalesce(nullif(btrim(phone),''), nullif(btrim(mobile),'')),
  mobile = coalesce(nullif(btrim(mobile),''), nullif(btrim(phone),'')),
  status = lower(coalesce(nullif(btrim(status),''),'active')),
  updated_at = coalesce(updated_at,now());

alter table public.nag_employees enable row level security;

do $$ begin
  create policy nag_employees_full_access_v200
  on public.nag_employees
  for all
  to anon, authenticated
  using (true)
  with check (true);
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on public.nag_employees to anon, authenticated;

do $$
declare seq_name text;
begin
  seq_name := pg_get_serial_sequence('public.nag_employees','id');
  if seq_name is not null then
    execute format('grant usage, select on sequence %s to anon, authenticated', seq_name);
  end if;
end $$;

commit;

notify pgrst, 'reload schema';

-- Verification. The ID column may be UUID, serial or GENERATED ALWAYS.
-- The application now inserts without ID and updates existing rows by ID.
select
  c.column_name,
  c.data_type,
  c.is_identity,
  c.identity_generation,
  c.column_default
from information_schema.columns c
where c.table_schema='public'
  and c.table_name='nag_employees'
  and c.column_name in ('id','emp_code','driving_license_no','driving_license_expiry')
order by case c.column_name when 'id' then 1 when 'emp_code' then 2 when 'driving_license_no' then 3 else 4 end;
