create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('product', 'service')),
  unit text not null check (unit in ('UN', 'KG', 'TON')),
  default_unit_price numeric(14,2) not null default 0,
  allow_custom_description boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.quote_items
  add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete set null;

create unique index if not exists uq_catalog_items_owner_code on public.catalog_items (owner_id, code);
create index if not exists idx_catalog_items_owner_active on public.catalog_items (owner_id, active);
create index if not exists idx_quote_items_catalog_item_id on public.quote_items (catalog_item_id);

alter table public.catalog_items enable row level security;

drop policy if exists catalog_items_select_own on public.catalog_items;
create policy catalog_items_select_own
on public.catalog_items
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists catalog_items_insert_own on public.catalog_items;
create policy catalog_items_insert_own
on public.catalog_items
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists catalog_items_update_own on public.catalog_items;
create policy catalog_items_update_own
on public.catalog_items
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists catalog_items_delete_own on public.catalog_items;
create policy catalog_items_delete_own
on public.catalog_items
for delete
to authenticated
using (auth.uid() = owner_id);
