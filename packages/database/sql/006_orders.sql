create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null,
  issue_date date not null,
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  source_quote_id uuid references public.quotes(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'processing', 'completed', 'cancelled')),
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  freight numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  code text not null,
  name text not null,
  unit text not null check (unit in ('UN', 'KG', 'TON')),
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  line_total numeric(14,2) not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_orders_owner_number on public.orders (owner_id, order_number);
create unique index if not exists uq_orders_source_quote on public.orders (source_quote_id) where source_quote_id is not null;

create index if not exists idx_orders_owner_id on public.orders (owner_id);
create index if not exists idx_orders_issue_date on public.orders (issue_date);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_order_items_order_id on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
on public.orders
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
on public.orders
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.companies c
    where c.id = company_id
      and c.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.clients cl
    where cl.id = client_id
      and cl.owner_id = auth.uid()
  )
);

drop policy if exists orders_update_own on public.orders;
create policy orders_update_own
on public.orders
for update
to authenticated
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.companies c
    where c.id = company_id
      and c.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.clients cl
    where cl.id = client_id
      and cl.owner_id = auth.uid()
  )
);

drop policy if exists orders_delete_own on public.orders;
create policy orders_delete_own
on public.orders
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.owner_id = auth.uid()
  )
);

drop policy if exists order_items_insert_own on public.order_items;
create policy order_items_insert_own
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.owner_id = auth.uid()
  )
);

drop policy if exists order_items_update_own on public.order_items;
create policy order_items_update_own
on public.order_items
for update
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.owner_id = auth.uid()
  )
);

drop policy if exists order_items_delete_own on public.order_items;
create policy order_items_delete_own
on public.order_items
for delete
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.owner_id = auth.uid()
  )
);
