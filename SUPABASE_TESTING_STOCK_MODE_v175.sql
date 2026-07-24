-- Nabd Al-Gharb v1.7.5 Testing Stock Mode
-- Run once in Supabase SQL Editor.

-- Negative warehouse stock is intentional in this workflow.
-- Remove any products check constraint that blocks a negative qty_on_hand value.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'products'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%qty_on_hand%'
  loop
    execute format('alter table public.products drop constraint if exists %I', r.conname);
  end loop;
end $$;

create or replace function public.decrement_stock(p_code text, p_qty numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set qty_on_hand = coalesce(qty_on_hand, 0) - greatest(coalesce(p_qty, 0), 0),
      updated_at = now()
  where code = p_code;
end;
$$;

create or replace function public.increment_stock(p_code text, p_qty numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set qty_on_hand = coalesce(qty_on_hand, 0) + greatest(coalesce(p_qty, 0), 0),
      updated_at = now()
  where code = p_code;
end;
$$;

grant execute on function public.decrement_stock(text, numeric) to anon, authenticated;
grant execute on function public.increment_stock(text, numeric) to anon, authenticated;
