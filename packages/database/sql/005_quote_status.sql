alter table public.quotes
  add column if not exists status text not null default 'draft';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_status_check'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_status_check
      check (status in ('draft', 'sent', 'approved', 'rejected', 'converted'));
  end if;
end
$$;

create index if not exists idx_quotes_owner_status on public.quotes (owner_id, status);
