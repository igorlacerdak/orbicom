create extension if not exists pgcrypto;

alter table public.workspace_invites
  add column if not exists token_hash text;

update public.workspace_invites
set token_hash = encode(digest(token, 'sha256'), 'hex')
where token_hash is null
  and token is not null;

do $$
begin
  if exists (
    select 1
    from public.workspace_invites wi
    where wi.token_hash is null
  ) then
    raise exception 'Existem convites sem token_hash. Corrija os dados antes de continuar.';
  end if;
end;
$$;

create unique index if not exists uq_workspace_invites_token_hash
  on public.workspace_invites (token_hash);

alter table public.workspace_invites
  alter column token_hash set not null;

alter table public.workspace_invites
  alter column token drop not null;

alter table public.workspace_invites
  drop constraint if exists workspace_invites_token_key;

update public.workspace_invites
set token = null
where token is not null;

create or replace function public.accept_workspace_invite(p_token text)
returns table (
  workspace_id uuid,
  workspace_name text,
  membership_status text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.workspace_invites%rowtype;
  v_token text := nullif(trim(p_token), '');
  v_token_hash text;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  if v_token is null then
    raise exception 'Token de convite ausente.';
  end if;

  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  select lower(u.email)
  into v_user_email
  from auth.users u
  where u.id = v_user_id;

  if v_user_email is null then
    raise exception 'Usuario autenticado sem email.';
  end if;

  update public.workspace_invites wi
  set
    status = 'expired',
    updated_at = timezone('utc', now())
  where wi.token_hash = v_token_hash
    and wi.status = 'pending'
    and wi.expires_at < timezone('utc', now());

  select *
  into v_invite
  from public.workspace_invites wi
  where wi.token_hash = v_token_hash
  limit 1
  for update;

  if not found then
    raise exception 'Convite nao encontrado.';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Convite nao esta pendente.';
  end if;

  if v_invite.expires_at < timezone('utc', now()) then
    raise exception 'Convite expirado.';
  end if;

  if lower(v_invite.email) <> v_user_email then
    raise exception 'Convite pertence a outro email.';
  end if;

  insert into public.workspace_members as wm (
    workspace_id,
    user_id,
    roles,
    status,
    joined_at,
    updated_at
  )
  values (
    v_invite.workspace_id,
    v_user_id,
    coalesce(v_invite.roles, array['operator']::text[]),
    'active',
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict on constraint workspace_members_workspace_id_user_id_key
  do update set
    roles = excluded.roles,
    status = 'active',
    joined_at = coalesce(wm.joined_at, excluded.joined_at),
    updated_at = timezone('utc', now());

  update public.workspace_invites wi
  set
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = timezone('utc', now()),
    token = null,
    updated_at = timezone('utc', now())
  where wi.id = v_invite.id;

  return query
  select
    w.id as workspace_id,
    w.name as workspace_name,
    'active'::text as membership_status
  from public.workspaces w
  where w.id = v_invite.workspace_id;
end;
$$;

grant execute on function public.accept_workspace_invite(text) to authenticated;
