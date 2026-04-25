create or replace function public.is_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid,
  p_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
      and wm.status = 'active'
      and (
        p_roles is null
        or wm.roles && p_roles
      )
  );
$$;

grant execute on function public.is_workspace_member(uuid, uuid, text[]) to authenticated;

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_workspace_member(workspaces.id, auth.uid(), null)
);

drop policy if exists workspaces_update_owner_admin on public.workspaces;
create policy workspaces_update_owner_admin
on public.workspaces
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_workspace_member(workspaces.id, auth.uid(), array['owner', 'admin']::text[])
)
with check (
  created_by = auth.uid()
  or public.is_workspace_member(workspaces.id, auth.uid(), array['owner', 'admin']::text[])
);

drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_workspace_member(workspace_members.workspace_id, auth.uid(), array['owner', 'admin']::text[])
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
      select 1
      from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.created_by = auth.uid()
    )
  )
  or public.is_workspace_member(workspace_members.workspace_id, auth.uid(), array['owner', 'admin']::text[])
);

drop policy if exists workspace_members_update_owner_admin on public.workspace_members;
create policy workspace_members_update_owner_admin
on public.workspace_members
for update
to authenticated
using (
  public.is_workspace_member(workspace_members.workspace_id, auth.uid(), array['owner', 'admin']::text[])
)
with check (
  public.is_workspace_member(workspace_members.workspace_id, auth.uid(), array['owner', 'admin']::text[])
);
