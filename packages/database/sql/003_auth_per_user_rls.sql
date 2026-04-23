-- Ajustes para autenticao por usuario + RLS em banco ja existente.
-- Execute este script apos 001_init.sql em projetos que ja possuem tabelas criadas.

alter table public.companies add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.clients add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.quotes add column if not exists owner_id uuid references auth.users(id) on delete cascade;

drop index if exists public.companies_document_key;
drop index if exists public.clients_document_key;
drop index if exists public.quotes_quote_number_key;

create unique index if not exists uq_companies_owner_document
  on public.companies (owner_id, document);
create unique index if not exists uq_clients_owner_document
  on public.clients (owner_id, document);
create unique index if not exists uq_quotes_owner_number
  on public.quotes (owner_id, quote_number);

create index if not exists idx_companies_owner_id on public.companies (owner_id);
create index if not exists idx_clients_owner_id on public.clients (owner_id);
create index if not exists idx_quotes_owner_id on public.quotes (owner_id);

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
