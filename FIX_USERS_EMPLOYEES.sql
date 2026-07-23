-- Fix Nabd Al-Gharb login users and employees table
-- Run this once in Supabase SQL Editor.
-- Final users:
-- 1) admin / 0878
-- 2) mushtaq / 0878
-- 3) mohsin / 0878

begin;

create table if not exists public.app_data (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Software login users, used by cloud sync.
insert into public.app_data (key, value, updated_at)
values ('nag_users', '[{"u":"admin","n":"Admin","role":"admin","h":"f4c0cea75a69f325f85fa6c273d3fae5d0caafa7edd774881d64ed664f3cefeb"},{"u":"mushtaq","n":"Mushtaq","role":"cashier","h":"f4c0cea75a69f325f85fa6c273d3fae5d0caafa7edd774881d64ed664f3cefeb","perms":["pickInvoice","pickReceipt","pickLedger","pickSalesReturn"],"priceAccess":"retail","allowCostPrice":false},{"u":"mohsin","n":"Mohsin","role":"cashier","h":"f4c0cea75a69f325f85fa6c273d3fae5d0caafa7edd774881d64ed664f3cefeb","perms":["pickInvoice","pickReceipt","pickLedger","pickSalesReturn"],"priceAccess":"retail","allowCostPrice":false}]', now())
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

-- Visible employees table fix.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='employees'
  ) then
    delete from public.employees;

    insert into public.employees
      (id, name, username, password_hash, role_id, branch_id, status, created_at)
    values
      (1, 'Admin',   'admin',   '0878', 1, 1, 'active', now()),
      (2, 'Mushtaq', 'mushtaq', '0878', 2, 1, 'active', now()),
      (3, 'Mohsin',  'mohsin',  '0878', 2, 1, 'active', now());

    begin
      perform setval(pg_get_serial_sequence('public.employees','id'), 3, true);
    exception when others then
      null;
    end;
  end if;
end $$;

commit;
