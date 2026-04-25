create table if not exists public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
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

alter table public.user_settings enable row level security;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own
on public.user_settings
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own
on public.user_settings
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own
on public.user_settings
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
