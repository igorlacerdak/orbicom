drop index if exists public.uq_financial_entries_receivable_order_installment;
create unique index if not exists uq_financial_entries_receivable_order_installment
on public.financial_entries (workspace_id, order_id, entry_type, installment_number)
where order_id is not null
  and entry_type = 'receivable'
  and status <> 'cancelled';

create or replace function public.sync_order_status_from_finance(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_active_count integer := 0;
  v_total numeric(14,2) := 0;
  v_paid numeric(14,2) := 0;
  v_next_status text := 'awaiting_billing';
begin
  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  select
    count(*)::integer,
    coalesce(sum(fe.amount_total), 0),
    coalesce(sum(fe.amount_paid), 0)
  into v_active_count, v_total, v_paid
  from public.financial_entries fe
  where fe.workspace_id = v_order.workspace_id
    and fe.order_id = v_order.id
    and fe.entry_type = 'receivable'
    and fe.status <> 'cancelled';

  if v_active_count = 0 then
    v_next_status := 'awaiting_billing';
  elsif v_paid <= 0 then
    v_next_status := 'billed';
  elsif v_paid < v_total then
    v_next_status := 'partially_paid';
  else
    v_next_status := 'paid';
  end if;

  update public.orders
  set status = v_next_status,
      updated_at = timezone('utc', now())
  where id = v_order.id;
end;
$$;

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
  v_entry_id uuid;
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
      and fe.status <> 'cancelled'
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

  if v_payment_method = 'a_vista' then
    v_count := 1;
    v_first_due := 0;
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
      paid_at,
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
      case when v_payment_method = 'a_vista' then 'paid' else 'open' end,
      v_idx,
      v_count,
      v_amount,
      case when v_payment_method = 'a_vista' then v_amount else 0 end,
      v_order.issue_date::date,
      v_due_date,
      case when v_payment_method = 'a_vista' then timezone('utc', now()) else null end,
      timezone('utc', now())
    )
    returning id into v_entry_id;

    if v_payment_method = 'a_vista' then
      insert into public.financial_payments (
        owner_id,
        workspace_id,
        financial_entry_id,
        amount,
        paid_at,
        method,
        notes
      ) values (
        v_order.owner_id,
        v_order.workspace_id,
        v_entry_id,
        v_amount,
        timezone('utc', now()),
        'a_vista',
        format('Baixa imediata do pedido %s', v_order.order_number)
      );
    end if;
  end loop;

  perform public.sync_order_status_from_finance(v_order.id);
end;
$$;

create or replace function public.settle_receivable_entry(
  p_entry_id uuid,
  p_amount numeric,
  p_paid_at timestamptz default timezone('utc', now()),
  p_method text default 'boleto',
  p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.financial_entries%rowtype;
  v_remaining numeric(12,2);
  v_method text;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  select fe.*
  into v_entry
  from public.financial_entries fe
  where fe.id = p_entry_id
  for update;

  if not found then
    raise exception 'Lancamento financeiro nao encontrado.';
  end if;

  if not exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = v_entry.workspace_id
      and wm.user_id = v_user_id
      and wm.status = 'active'
      and wm.roles && array['owner', 'admin', 'finance']::text[]
  ) then
    raise exception 'Sem permissao para realizar baixa.';
  end if;

  if v_entry.entry_type <> 'receivable' then
    raise exception 'A baixa so pode ser realizada em contas a receber.';
  end if;

  if v_entry.status in ('cancelled', 'paid') then
    raise exception 'Este lancamento nao aceita baixa.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor de baixa invalido.';
  end if;

  v_remaining := greatest(v_entry.amount_total - v_entry.amount_paid, 0);

  if p_amount > v_remaining then
    raise exception 'Valor de baixa maior que o saldo em aberto.';
  end if;

  v_method := nullif(trim(p_method), '');
  if v_method is null then
    v_method := coalesce(nullif(trim(v_entry.payment_method), ''), 'boleto');
  end if;

  insert into public.financial_payments (
    owner_id,
    workspace_id,
    financial_entry_id,
    amount,
    paid_at,
    method,
    notes
  ) values (
    v_entry.owner_id,
    v_entry.workspace_id,
    v_entry.id,
    p_amount,
    coalesce(p_paid_at, timezone('utc', now())),
    v_method,
    coalesce(p_notes, '')
  );

  update public.financial_entries
  set amount_paid = amount_paid + p_amount,
      status = case
        when amount_paid + p_amount >= amount_total then 'paid'
        else 'partial'
      end,
      paid_at = case
        when amount_paid + p_amount >= amount_total then coalesce(p_paid_at, timezone('utc', now()))
        else null
      end,
      updated_at = timezone('utc', now())
  where id = v_entry.id;

  if v_entry.order_id is not null then
    perform public.sync_order_status_from_finance(v_entry.order_id);
  end if;
end;
$$;

create or replace function public.reopen_billed_order_without_payments(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

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
    raise exception 'Sem permissao para reabrir pedido.';
  end if;

  if v_order.status <> 'billed' then
    raise exception 'Somente pedidos faturados sem baixa podem voltar para aberto.';
  end if;

  if exists (
    select 1
    from public.financial_entries fe
    where fe.workspace_id = v_order.workspace_id
      and fe.order_id = v_order.id
      and fe.entry_type = 'receivable'
      and fe.amount_paid > 0
  ) then
    raise exception 'Este pedido possui baixa no financeiro. Execute estorno total para reabrir.';
  end if;

  update public.financial_entries
  set status = 'cancelled',
      updated_at = timezone('utc', now())
  where workspace_id = v_order.workspace_id
    and order_id = v_order.id
    and entry_type = 'receivable'
    and status <> 'cancelled';

  update public.orders
  set status = 'awaiting_billing',
      updated_at = timezone('utc', now())
  where id = v_order.id;
end;
$$;

create or replace function public.reverse_order_finance_total(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_entry record;
  v_has_receivable boolean := false;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  select o.*
  into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

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
    raise exception 'Sem permissao para estornar financeiro do pedido.';
  end if;

  for v_entry in
    select fe.id, fe.owner_id, fe.workspace_id, fe.amount_paid
    from public.financial_entries fe
    where fe.workspace_id = v_order.workspace_id
      and fe.order_id = v_order.id
      and fe.entry_type = 'receivable'
      and fe.status <> 'cancelled'
    for update
  loop
    v_has_receivable := true;

    if v_entry.amount_paid > 0 then
      insert into public.financial_payments (
        owner_id,
        workspace_id,
        financial_entry_id,
        amount,
        paid_at,
        method,
        notes
      ) values (
        v_entry.owner_id,
        v_entry.workspace_id,
        v_entry.id,
        -v_entry.amount_paid,
        timezone('utc', now()),
        'estorno_total',
        format('Estorno total para reabertura do pedido %s', v_order.order_number)
      );
    end if;
  end loop;

  if not v_has_receivable then
    raise exception 'Pedido sem contas a receber ativas para estorno.';
  end if;

  update public.financial_entries
  set amount_paid = 0,
      paid_at = null,
      status = 'cancelled',
      updated_at = timezone('utc', now())
  where workspace_id = v_order.workspace_id
    and order_id = v_order.id
    and entry_type = 'receivable'
    and status <> 'cancelled';

  update public.orders
  set status = 'awaiting_billing',
      updated_at = timezone('utc', now())
  where id = v_order.id;
end;
$$;

grant execute on function public.sync_order_status_from_finance(uuid) to authenticated;
grant execute on function public.settle_receivable_entry(uuid, numeric, timestamptz, text, text) to authenticated;
grant execute on function public.reopen_billed_order_without_payments(uuid) to authenticated;
grant execute on function public.reverse_order_finance_total(uuid) to authenticated;
grant execute on function public.ensure_receivables_for_order(uuid) to authenticated;
