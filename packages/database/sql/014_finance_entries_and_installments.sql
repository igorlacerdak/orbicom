alter table public.workspace_settings
  add column if not exists receivable_installments_count integer not null default 3,
  add column if not exists receivable_first_due_days integer not null default 30,
  add column if not exists receivable_interval_days integer not null default 30;

alter table public.workspace_settings
  add constraint workspace_settings_receivable_installments_count_check
  check (receivable_installments_count between 1 and 24);

alter table public.workspace_settings
  add constraint workspace_settings_receivable_first_due_days_check
  check (receivable_first_due_days between 0 and 365);

alter table public.workspace_settings
  add constraint workspace_settings_receivable_interval_days_check
  check (receivable_interval_days between 1 and 365);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_id uuid null references public.orders(id) on delete set null,
  entry_type text not null check (entry_type in ('receivable', 'payable')),
  category text not null default '',
  description text not null default '',
  counterparty_name text not null default '',
  status text not null default 'open' check (status in ('open', 'partial', 'paid', 'overdue', 'cancelled')),
  installment_number integer not null default 1,
  installment_total integer not null default 1,
  amount_total numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  issued_at date not null default (timezone('utc', now()))::date,
  due_date date not null,
  paid_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financial_entries_installment_bounds check (installment_number between 1 and installment_total)
);

create index if not exists idx_financial_entries_workspace_type_due
on public.financial_entries (workspace_id, entry_type, due_date);

create index if not exists idx_financial_entries_workspace_status
on public.financial_entries (workspace_id, status);

create unique index if not exists uq_financial_entries_receivable_order_installment
on public.financial_entries (workspace_id, order_id, entry_type, installment_number)
where order_id is not null and entry_type = 'receivable';

create table if not exists public.financial_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  financial_entry_id uuid not null references public.financial_entries(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default timezone('utc', now()),
  method text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_financial_payments_workspace_entry
on public.financial_payments (workspace_id, financial_entry_id);

alter table public.financial_entries enable row level security;
alter table public.financial_payments enable row level security;

drop policy if exists financial_entries_select_roles on public.financial_entries;
create policy financial_entries_select_roles
on public.financial_entries
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_entries.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

drop policy if exists financial_entries_insert_roles on public.financial_entries;
create policy financial_entries_insert_roles
on public.financial_entries
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_entries.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

drop policy if exists financial_entries_update_roles on public.financial_entries;
create policy financial_entries_update_roles
on public.financial_entries
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_entries.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_entries.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

drop policy if exists financial_entries_delete_roles on public.financial_entries;
create policy financial_entries_delete_roles
on public.financial_entries
for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_entries.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

drop policy if exists financial_payments_select_roles on public.financial_payments;
create policy financial_payments_select_roles
on public.financial_payments
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_payments.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

drop policy if exists financial_payments_insert_roles on public.financial_payments;
create policy financial_payments_insert_roles
on public.financial_payments
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_payments.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

drop policy if exists financial_payments_update_roles on public.financial_payments;
create policy financial_payments_update_roles
on public.financial_payments
for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_payments.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_payments.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

drop policy if exists financial_payments_delete_roles on public.financial_payments;
create policy financial_payments_delete_roles
on public.financial_payments
for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = financial_payments.workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  )
);

create or replace function public.ensure_receivables_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_client_name text := 'Cliente';
  v_count integer;
  v_first_due integer;
  v_interval integer;
  v_base_cents integer;
  v_remainder integer;
  v_amount_cents integer;
  v_amount numeric(12,2);
  v_due_date date;
  v_idx integer;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  if not exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = v_order.workspace_id
      and wm.user_id = v_user_id
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'operator']::text[]
  ) then
    raise exception 'Sem permissao para gerar financeiro deste pedido.';
  end if;

  if exists (
    select 1
    from public.financial_entries fe
    where fe.workspace_id = v_order.workspace_id
      and fe.order_id = v_order.id
      and fe.entry_type = 'receivable'
  ) then
    return;
  end if;

  select c.name
  into v_client_name
  from public.clients c
  where c.id = v_order.client_id;

  select
    ws.receivable_installments_count,
    ws.receivable_first_due_days,
    ws.receivable_interval_days
  into v_count, v_first_due, v_interval
  from public.workspace_settings ws
  where ws.workspace_id = v_order.workspace_id;

  v_count := greatest(1, least(24, coalesce(v_count, 3)));
  v_first_due := greatest(0, least(365, coalesce(v_first_due, 30)));
  v_interval := greatest(1, least(365, coalesce(v_interval, 30)));

  v_base_cents := floor((v_order.total * 100)::numeric / v_count);
  v_remainder := (v_order.total * 100)::integer - (v_base_cents * v_count);

  for v_idx in 1..v_count loop
    v_amount_cents := v_base_cents + case when v_idx <= v_remainder then 1 else 0 end;
    v_amount := v_amount_cents / 100.0;
    v_due_date := (v_order.issue_date::date + (v_first_due + (v_idx - 1) * v_interval));

    insert into public.financial_entries (
      owner_id,
      workspace_id,
      order_id,
      entry_type,
      category,
      description,
      counterparty_name,
      status,
      installment_number,
      installment_total,
      amount_total,
      amount_paid,
      issued_at,
      due_date,
      updated_at
    ) values (
      v_order.owner_id,
      v_order.workspace_id,
      v_order.id,
      'receivable',
      'venda',
      format('Recebimento do pedido %s (%s/%s)', v_order.order_number, v_idx, v_count),
      coalesce(v_client_name, 'Cliente'),
      'open',
      v_idx,
      v_count,
      v_amount,
      0,
      v_order.issue_date::date,
      v_due_date,
      timezone('utc', now())
    );
  end loop;
end;
$$;

grant execute on function public.ensure_receivables_for_order(uuid) to authenticated;
