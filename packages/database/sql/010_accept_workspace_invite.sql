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
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.workspace_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  select lower(u.email)
  into v_user_email
  from auth.users u
  where u.id = v_user_id;

  if v_user_email is null then
    raise exception 'Usuario autenticado sem email.';
  end if;

  update public.workspace_invites
  set
    status = 'expired',
    updated_at = timezone('utc', now())
  where token = p_token
    and status = 'pending'
    and expires_at < timezone('utc', now());

  select *
  into v_invite
  from public.workspace_invites
  where token = p_token
  limit 1;

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

  insert into public.workspace_members (
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
  on conflict (workspace_id, user_id)
  do update set
    roles = excluded.roles,
    status = 'active',
    joined_at = coalesce(public.workspace_members.joined_at, excluded.joined_at),
    updated_at = timezone('utc', now());

  update public.workspace_invites
  set
    status = 'accepted',
    accepted_by = v_user_id,
    accepted_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_invite.id;

  return query
  select
    w.id,
    w.name,
    'active'::text
  from public.workspaces w
  where w.id = v_invite.workspace_id;
end;
$$;

grant execute on function public.accept_workspace_invite(text) to authenticated;
