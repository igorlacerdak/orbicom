drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);

drop policy if exists workspace_members_insert_owner_admin on public.workspace_members;
create policy workspace_members_insert_owner_admin
on public.workspace_members
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);

drop policy if exists workspace_members_update_owner_admin on public.workspace_members;
create policy workspace_members_update_owner_admin
on public.workspace_members
for update
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);
