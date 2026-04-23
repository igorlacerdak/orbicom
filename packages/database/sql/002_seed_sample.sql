-- Script opcional para dados de exemplo (ambiente dev)

-- IMPORTANTE:
-- 1) Crie um usuario pelo fluxo de login do app (Supabase Auth).
-- 2) Substitua o UUID abaixo pelo auth.users.id desse usuario.

with seed_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as id
),

company as (
  insert into public.companies (
    owner_id,
    name,
    document,
    state_registration,
    phone,
    address,
    zip_code,
    city,
    state,
    logo_url
  )
  select
    seed_user.id,
    'R.A RONALDO LACERDA M.E',
    '06.020.782/0001-07',
    '002091153.00-53',
    '(34) 99151-1712',
    'RUA CARLOS LUIZ BRAZ, SAO DIMAS',
    '38950-000',
    'IBIA',
    'MG',
    null
  from seed_user
  on conflict (owner_id, document)
  do update set
    name = excluded.name,
    state_registration = excluded.state_registration,
    phone = excluded.phone,
    address = excluded.address,
    zip_code = excluded.zip_code,
    city = excluded.city,
    state = excluded.state,
    logo_url = excluded.logo_url,
    updated_at = timezone('utc', now())
  returning id
),
client as (
  insert into public.clients (
    owner_id,
    name,
    document,
    state_registration,
    phone,
    address,
    zip_code,
    city,
    state
  )
  select
    seed_user.id,
    'CONSTRUTORA ATERPA S/A',
    '17.162.983/0048-29',
    '000000000.00-00',
    '(31) 2125-5000',
    'R JUVELINO ALVES BITTENCOURT, QUADRA50 LOTE 16, VILA SILVERIA',
    '38183-394',
    'ARAXA',
    'MG'
  from seed_user
  on conflict (owner_id, document)
  do update set
    name = excluded.name,
    state_registration = excluded.state_registration,
    phone = excluded.phone,
    address = excluded.address,
    zip_code = excluded.zip_code,
    city = excluded.city,
    state = excluded.state,
    updated_at = timezone('utc', now())
  returning id
),
quote as (
  insert into public.quotes (
    owner_id,
    quote_number,
    issue_date,
    company_id,
    client_id,
    discount_type,
    discount_value,
    freight,
    tax_rate,
    subtotal,
    discount_amount,
    tax_amount,
    total,
    notes,
    status
  )
  select
    seed_user.id,
    'ORC-2026-0001',
    current_date,
    company.id,
    client.id,
    'fixed',
    100,
    120,
    8,
    2000,
    100,
    161.6,
    2181.6,
    'Dados de exemplo para teste.',
    'draft'
  from seed_user, company, client
  on conflict (owner_id, quote_number)
  do update set
    issue_date = excluded.issue_date,
    company_id = excluded.company_id,
    client_id = excluded.client_id,
    discount_type = excluded.discount_type,
    discount_value = excluded.discount_value,
    freight = excluded.freight,
    tax_rate = excluded.tax_rate,
    subtotal = excluded.subtotal,
    discount_amount = excluded.discount_amount,
    tax_amount = excluded.tax_amount,
    total = excluded.total,
    notes = excluded.notes,
    updated_at = timezone('utc', now())
  returning id
)
insert into public.quote_items (
  quote_id,
  code,
  name,
  unit,
  quantity,
  unit_price,
  line_total,
  position
)
select
  quote.id,
  item.code,
  item.name,
  item.unit,
  item.quantity,
  item.unit_price,
  item.line_total,
  item.position
from quote
cross join (
  values
    ('COD-0001', 'Brita 1', 'TON', 10.000::numeric, 120.00::numeric, 1200.00::numeric, 0),
    ('COD-0002', 'Areia fina', 'TON', 8.000::numeric, 100.00::numeric, 800.00::numeric, 1)
) as item(code, name, unit, quantity, unit_price, line_total, position)
on conflict do nothing;
