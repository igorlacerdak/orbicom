update public.orders
set status = case
  when status in ('open', 'processing') then 'awaiting_billing'
  when status = 'completed' then 'paid'
  else status
end
where status in ('open', 'processing', 'completed');

do $$
begin
  if exists (
    select 1
    from public.orders o
    where o.status not in ('awaiting_billing', 'billed', 'partially_paid', 'paid', 'cancelled')
  ) then
    raise exception 'Existem status de pedidos invalidos fora do conjunto suportado.';
  end if;
end;
$$;

alter table public.orders alter column status set default 'awaiting_billing';

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('awaiting_billing', 'billed', 'partially_paid', 'paid', 'cancelled'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_receivable_installments_count_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_receivable_installments_count_check
      check (receivable_installments_count between 1 and 24);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_receivable_first_due_days_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_receivable_first_due_days_check
      check (receivable_first_due_days between 0 and 365);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_receivable_interval_days_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_receivable_interval_days_check
      check (receivable_interval_days between 1 and 365);
  end if;
end;
$$;

alter table public.financial_entries
  add column if not exists payment_method text not null default 'boleto';

update public.orders o
set status = 'billed',
    updated_at = timezone('utc', now())
where o.status = 'awaiting_billing'
  and exists (
    select 1
    from public.financial_entries fe
    where fe.workspace_id = o.workspace_id
      and fe.order_id = o.id
      and fe.entry_type = 'receivable'
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
  v_payment_method text;
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
      and wm.roles && array['owner', 'admin', 'finance']::text[]
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
    coalesce(v_order.receivable_installments_count, ws.receivable_installments_count, 3),
    coalesce(v_order.receivable_first_due_days, ws.receivable_first_due_days, 30),
    coalesce(v_order.receivable_interval_days, ws.receivable_interval_days, 30)
  into v_count, v_first_due, v_interval
  from public.workspace_settings ws
  where ws.workspace_id = v_order.workspace_id;

  v_count := greatest(1, least(24, coalesce(v_count, 3)));
  v_first_due := greatest(0, least(365, coalesce(v_first_due, 30)));
  v_interval := greatest(1, least(365, coalesce(v_interval, 30)));
  v_payment_method := nullif(trim(v_order.payment_method), '');
  if v_payment_method is null then
    v_payment_method := 'boleto';
  end if;

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
      payment_method,
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
      v_payment_method,
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

  if v_order.status = 'awaiting_billing' then
    update public.orders
    set status = 'billed',
        updated_at = timezone('utc', now())
    where id = v_order.id;
  end if;
end;
$$;

grant execute on function public.ensure_receivables_for_order(uuid) to authenticated;
