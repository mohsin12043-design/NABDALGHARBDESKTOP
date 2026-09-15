-- Nabd Al-Gharb Commercial Invoice module
-- Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.nag_commercial_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  invoice_date date not null,
  reference_no text,
  terms text default 'FOB',
  currency text default 'USD',
  status text default 'Draft',
  consignee_name text not null,
  consignee_country text,
  consignee_address text,
  consignee_contact text,
  shipping_marks text,
  packages text,
  gross_weight text,
  net_weight text,
  country_origin text,
  courier text,
  discount numeric(14,2) default 0,
  freight numeric(14,2) default 0,
  insurance numeric(14,2) default 0,
  other_charges numeric(14,2) default 0,
  items jsonb not null default '[]'::jsonb,
  total_usd numeric(14,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.nag_commercial_invoices enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='nag_commercial_invoices' and policyname='Allow commercial invoice access') then
    create policy "Allow commercial invoice access" on public.nag_commercial_invoices for all using (true) with check (true);
  end if;
end $$;

create index if not exists nag_commercial_invoices_date_idx on public.nag_commercial_invoices(invoice_date desc);
