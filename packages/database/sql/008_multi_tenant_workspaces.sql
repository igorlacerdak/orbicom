create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  is_personal boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  roles text[] not null default array['operator']::text[],
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  roles text[] not null default array['operator']::text[],
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  company_name text not null default '',
  company_document text not null default '',
  company_state_registration text not null default '',
  company_phone text not null default '',
  company_address text not null default '',
  company_zip_code text not null default '',
  company_city text not null default '',
  company_state text not null default '',
  company_logo_url text,
  default_discount_type text not null default 'fixed' check (default_discount_type in ('fixed', 'percent')),
  default_discount_value numeric(14,2) not null default 0,
  default_freight numeric(14,2) not null default 0,
  default_tax_rate numeric(8,2) not null default 0,
  default_validity_days integer not null default 7,
  default_notes text not null default '',
  quote_prefix text not null default 'ORC',
  quote_sequence integer not null default 1,
  order_prefix text not null default 'PED',
  order_sequence integer not null default 1,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_workspaces_personal_by_user
  on public.workspaces (created_by)
  where is_personal = true;

create index if not exists idx_workspace_members_user on public.workspace_members (user_id);
create index if not exists idx_workspace_members_workspace on public.workspace_members (workspace_id);
create index if not exists idx_workspace_invites_workspace on public.workspace_invites (workspace_id);
create index if not exists idx_workspace_invites_email on public.workspace_invites (email);
create index if not exists idx_workspace_invites_status_exp on public.workspace_invites (status, expires_at);

with owners as (
  select distinct owner_id as user_id from public.companies
  union select distinct owner_id as user_id from public.clients
  union select distinct owner_id as user_id from public.quotes
  union select distinct owner_id as user_id from public.catalog_items
  union select distinct owner_id as user_id from public.orders
  union select distinct owner_id as user_id from public.user_settings
)
insert into public.workspaces (name, slug, created_by, is_personal)
select
  'Workspace principal',
  'personal-' || substr(md5(o.user_id::text), 1, 20),
  o.user_id,
  true
from owners o
on conflict (slug) do nothing;

insert into public.workspace_members (workspace_id, user_id, roles, status, joined_at)
select
  w.id,
  w.created_by,
  array['owner', 'admin', 'operator', 'finance']::text[],
  'active',
  timezone('utc', now())
from public.workspaces w
where w.is_personal = true
on conflict (workspace_id, user_id) do nothing;

alter table public.companies add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.clients add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.quotes add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.orders add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.catalog_items add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

update public.companies c
set workspace_id = w.id
from public.workspaces w
where w.created_by = c.owner_id
  and w.is_personal = true
  and c.workspace_id is null;

update public.clients c
set workspace_id = w.id
from public.workspaces w
where w.created_by = c.owner_id
  and w.is_personal = true
  and c.workspace_id is null;

update public.quotes q
set workspace_id = w.id
from public.workspaces w
where w.created_by = q.owner_id
  and w.is_personal = true
  and q.workspace_id is null;

update public.orders o
set workspace_id = w.id
from public.workspaces w
where w.created_by = o.owner_id
  and w.is_personal = true
  and o.workspace_id is null;

update public.catalog_items ci
set workspace_id = w.id
from public.workspaces w
where w.created_by = ci.owner_id
  and w.is_personal = true
  and ci.workspace_id is null;

insert into public.workspace_settings (
  workspace_id,
  company_name,
  company_document,
  company_state_registration,
  company_phone,
  company_address,
  company_zip_code,
  company_city,
  company_state,
  company_logo_url,
  default_discount_type,
  default_discount_value,
  default_freight,
  default_tax_rate,
  default_validity_days,
  default_notes,
  quote_prefix,
  quote_sequence,
  order_prefix,
  order_sequence,
  onboarding_completed_at,
  created_at,
  updated_at
)
select
  w.id,
  us.company_name,
  us.company_document,
  us.company_state_registration,
  us.company_phone,
  us.company_address,
  us.company_zip_code,
  us.company_city,
  us.company_state,
  us.company_logo_url,
  us.default_discount_type,
  us.default_discount_value,
  us.default_freight,
  us.default_tax_rate,
  us.default_validity_days,
  us.default_notes,
  us.quote_prefix,
  us.quote_sequence,
  us.order_prefix,
  us.order_sequence,
  us.onboarding_completed_at,
  us.created_at,
  us.updated_at
from public.user_settings us
join public.workspaces w
  on w.created_by = us.owner_id
 and w.is_personal = true
on conflict (workspace_id) do nothing;

alter table public.companies alter column workspace_id set not null;
alter table public.clients alter column workspace_id set not null;
alter table public.quotes alter column workspace_id set not null;
alter table public.orders alter column workspace_id set not null;
alter table public.catalog_items alter column workspace_id set not null;

create unique index if not exists uq_companies_workspace_document on public.companies (workspace_id, document);
create unique index if not exists uq_clients_workspace_document on public.clients (workspace_id, document);
create unique index if not exists uq_quotes_workspace_number on public.quotes (workspace_id, quote_number);
create unique index if not exists uq_orders_workspace_number on public.orders (workspace_id, order_number);
create unique index if not exists uq_catalog_workspace_code on public.catalog_items (workspace_id, code);

create index if not exists idx_companies_workspace on public.companies (workspace_id);
create index if not exists idx_clients_workspace on public.clients (workspace_id);
create index if not exists idx_quotes_workspace on public.quotes (workspace_id);
create index if not exists idx_orders_workspace on public.orders (workspace_id);
create index if not exists idx_catalog_workspace on public.catalog_items (workspace_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_settings enable row level security;

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists workspaces_insert_owner on public.workspaces;
create policy workspaces_insert_owner
on public.workspaces
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists workspaces_update_owner_admin on public.workspaces;
create policy workspaces_update_owner_admin
on public.workspaces
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
);

drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member
on public.workspace_members
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members me
    where me.workspace_id = workspace_members.workspace_id
      and me.user_id = auth.uid()
      and me.status = 'active'
  )
);

drop policy if exists workspace_members_insert_owner_admin on public.workspace_members;
create policy workspace_members_insert_owner_admin
on public.workspace_members
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and roles && array['owner']::text[]
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.created_by = auth.uid()
    )
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
);

drop policy if exists workspace_members_update_owner_admin on public.workspace_members;
create policy workspace_members_update_owner_admin
on public.workspace_members
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
);

drop policy if exists workspace_invites_select_owner_admin on public.workspace_invites;
create policy workspace_invites_select_owner_admin
on public.workspace_invites
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists workspace_invites_insert_owner_admin on public.workspace_invites;
create policy workspace_invites_insert_owner_admin
on public.workspace_invites
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
);

drop policy if exists workspace_invites_update_owner_admin on public.workspace_invites;
create policy workspace_invites_update_owner_admin
on public.workspace_invites
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
);

drop policy if exists workspace_settings_select_member on public.workspace_settings;
create policy workspace_settings_select_member
on public.workspace_settings
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_settings.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists workspace_settings_insert_owner_admin on public.workspace_settings;
create policy workspace_settings_insert_owner_admin
on public.workspace_settings
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_settings.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin']::text[]
  )
);

drop policy if exists workspace_settings_update_owner_admin on public.workspace_settings;
create policy workspace_settings_update_owner_admin
on public.workspace_settings
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_settings.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_settings.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

drop policy if exists companies_select_own on public.companies;
drop policy if exists companies_insert_own on public.companies;
drop policy if exists companies_update_own on public.companies;
drop policy if exists companies_delete_own on public.companies;

create policy companies_select_workspace
on public.companies
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = companies.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

create policy companies_insert_workspace
on public.companies
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = companies.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy companies_update_workspace
on public.companies
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = companies.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = companies.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy companies_delete_workspace
on public.companies
for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = companies.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

drop policy if exists clients_select_own on public.clients;
drop policy if exists clients_insert_own on public.clients;
drop policy if exists clients_update_own on public.clients;
drop policy if exists clients_delete_own on public.clients;

create policy clients_select_workspace
on public.clients
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = clients.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

create policy clients_insert_workspace
on public.clients
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = clients.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy clients_update_workspace
on public.clients
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = clients.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = clients.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy clients_delete_workspace
on public.clients
for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = clients.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

drop policy if exists quotes_select_own on public.quotes;
drop policy if exists quotes_insert_own on public.quotes;
drop policy if exists quotes_update_own on public.quotes;
drop policy if exists quotes_delete_own on public.quotes;

create policy quotes_select_workspace
on public.quotes
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = quotes.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

create policy quotes_insert_workspace
on public.quotes
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = quotes.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy quotes_update_workspace
on public.quotes
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = quotes.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = quotes.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy quotes_delete_workspace
on public.quotes
for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = quotes.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

drop policy if exists orders_select_own on public.orders;
drop policy if exists orders_insert_own on public.orders;
drop policy if exists orders_update_own on public.orders;
drop policy if exists orders_delete_own on public.orders;

create policy orders_select_workspace
on public.orders
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = orders.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

create policy orders_insert_workspace
on public.orders
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = orders.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy orders_update_workspace
on public.orders
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = orders.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = orders.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy orders_delete_workspace
on public.orders
for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = orders.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

drop policy if exists catalog_items_select_own on public.catalog_items;
drop policy if exists catalog_items_insert_own on public.catalog_items;
drop policy if exists catalog_items_update_own on public.catalog_items;
drop policy if exists catalog_items_delete_own on public.catalog_items;

create policy catalog_items_select_workspace
on public.catalog_items
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = catalog_items.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

create policy catalog_items_insert_workspace
on public.catalog_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = catalog_items.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy catalog_items_update_workspace
on public.catalog_items
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = catalog_items.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = catalog_items.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);

create policy catalog_items_delete_workspace
on public.catalog_items
for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = catalog_items.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  )
);
