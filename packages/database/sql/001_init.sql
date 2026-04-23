create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document text not null,
  state_registration text not null default '',
  phone text not null,
  address text not null,
  zip_code text not null,
  city text not null,
  state text not null,
  logo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document text not null,
  state_registration text not null default '',
  phone text not null,
  address text not null,
  zip_code text not null,
  city text not null,
  state text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  quote_number text not null,
  issue_date date not null,
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value numeric(14,2) not null default 0,
  freight numeric(14,2) not null default 0,
  tax_rate numeric(8,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text not null default '',
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  code text not null,
  name text not null,
  unit text not null check (unit in ('UN', 'KG', 'TON')),
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  line_total numeric(14,2) not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_companies_owner_document
  on public.companies (owner_id, document);
create unique index if not exists uq_clients_owner_document
  on public.clients (owner_id, document);
create unique index if not exists uq_quotes_owner_number
  on public.quotes (owner_id, quote_number);

create index if not exists idx_quotes_issue_date on public.quotes (issue_date);
create index if not exists idx_quotes_client_id on public.quotes (client_id);
create index if not exists idx_quotes_owner_id on public.quotes (owner_id);
create index if not exists idx_quote_items_quote_id on public.quote_items (quote_id);
create index if not exists idx_companies_owner_id on public.companies (owner_id);
create index if not exists idx_clients_owner_id on public.clients (owner_id);

alter table public.companies enable row level security;
alter table public.clients enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

drop policy if exists companies_select_own on public.companies;
create policy companies_select_own
on public.companies
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own
on public.companies
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists companies_update_own on public.companies;
create policy companies_update_own
on public.companies
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists companies_delete_own on public.companies;
create policy companies_delete_own
on public.companies
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists clients_select_own on public.clients;
create policy clients_select_own
on public.clients
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists clients_insert_own on public.clients;
create policy clients_insert_own
on public.clients
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists clients_update_own on public.clients;
create policy clients_update_own
on public.clients
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists clients_delete_own on public.clients;
create policy clients_delete_own
on public.clients
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists quotes_select_own on public.quotes;
create policy quotes_select_own
on public.quotes
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists quotes_insert_own on public.quotes;
create policy quotes_insert_own
on public.quotes
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

drop policy if exists quotes_update_own on public.quotes;
create policy quotes_update_own
on public.quotes
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

drop policy if exists quotes_delete_own on public.quotes;
create policy quotes_delete_own
on public.quotes
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists quote_items_select_own on public.quote_items;
create policy quote_items_select_own
on public.quote_items
for select
to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and q.owner_id = auth.uid()
  )
);

drop policy if exists quote_items_insert_own on public.quote_items;
create policy quote_items_insert_own
on public.quote_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and q.owner_id = auth.uid()
  )
);

drop policy if exists quote_items_update_own on public.quote_items;
create policy quote_items_update_own
on public.quote_items
for update
to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and q.owner_id = auth.uid()
  )
);

drop policy if exists quote_items_delete_own on public.quote_items;
create policy quote_items_delete_own
on public.quote_items
for delete
to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_items.quote_id
      and q.owner_id = auth.uid()
  )
);
