-- Nabd Al-Gharb Desktop v2.0.8
-- Run once in Supabase SQL Editor.

alter table public.damaged_stock add column if not exists reference_no text;
alter table public.damaged_stock add column if not exists source_type text default 'manual';
alter table public.damaged_stock add column if not exists source_reference text;
alter table public.damaged_stock add column if not exists source_invoice_no text;
alter table public.damaged_stock add column if not exists location_kind text default 'warehouse';
alter table public.damaged_stock add column if not exists location_id text default 'main_warehouse';
alter table public.damaged_stock add column if not exists location_name text default 'Main Warehouse';
alter table public.damaged_stock add column if not exists cashier_u text;
alter table public.damaged_stock add column if not exists cashier_name text;
alter table public.damaged_stock add column if not exists stock_effect text default 'decreased_from_location';

update public.damaged_stock
set reference_no = 'DMG-' || replace(coalesce(entry_date::text,current_date::text),'-','') || '-' || right(id::text,6)
where coalesce(reference_no,'')='';

create unique index if not exists damaged_stock_reference_no_uidx
on public.damaged_stock(reference_no)
where reference_no is not null;

create index if not exists damaged_stock_source_reference_idx
on public.damaged_stock(source_type,source_reference);

create index if not exists damaged_stock_location_idx
on public.damaged_stock(location_kind,location_id);
