create table if not exists public.client_addresses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null default 'principal',
  street text not null,
  number text not null default '',
  complement text not null default '',
  district text not null default '',
  city text not null,
  state text not null,
  zip_code text not null,
  country text not null default 'Brasil',
  is_primary boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_client_addresses_workspace_client
  on public.client_addresses (workspace_id, client_id);

create unique index if not exists uq_client_addresses_primary_per_client
  on public.client_addresses (workspace_id, client_id)
  where is_primary = true;

insert into public.client_addresses (
  owner_id,
  workspace_id,
  client_id,
  label,
  street,
  number,
  complement,
  district,
  city,
  state,
  zip_code,
  country,
  is_primary
)
select
  c.owner_id,
  c.workspace_id,
  c.id,
  'principal',
  coalesce(c.address, ''),
  '',
  '',
  '',
  coalesce(c.city, ''),
  coalesce(c.state, ''),
  coalesce(c.zip_code, ''),
  'Brasil',
  true
from public.clients c
where not exists (
  select 1
  from public.client_addresses ca
  where ca.workspace_id = c.workspace_id
    and ca.client_id = c.id
    and ca.is_primary = true
);

alter table public.client_addresses enable row level security;

drop policy if exists client_addresses_select_workspace on public.client_addresses;
create policy client_addresses_select_workspace
on public.client_addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = client_addresses.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists client_addresses_insert_workspace on public.client_addresses;
create policy client_addresses_insert_workspace
on public.client_addresses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = client_addresses.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists client_addresses_update_workspace on public.client_addresses;
create policy client_addresses_update_workspace
on public.client_addresses
for update
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = client_addresses.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = client_addresses.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

drop policy if exists client_addresses_delete_workspace on public.client_addresses;
create policy client_addresses_delete_workspace
on public.client_addresses
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = client_addresses.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);
