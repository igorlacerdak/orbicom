import { cookies } from 'next/headers';

import { MissingWorkspaceError, UnauthorizedError } from '@/server/errors';
import { createClient } from '@/utils/supabase/server';

export const WORKSPACE_COOKIE = 'orbicom_workspace_id';

export type WorkspaceRole = 'owner' | 'admin' | 'operator' | 'finance';

type WorkspaceMembershipRow = {
  workspace_id: string;
  roles: string[];
  status: 'active' | 'invited' | 'disabled';
  workspaces: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type RawWorkspaceMembershipRow = {
  workspace_id: string;
  roles: string[];
  status: 'active' | 'invited' | 'disabled';
  workspaces:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  roles: WorkspaceRole[];
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    roles: WorkspaceRole[];
  }>;
};

const normalizeRoles = (
  roles: string[] | null | undefined,
): WorkspaceRole[] => {
  const allowed: WorkspaceRole[] = ['owner', 'admin', 'operator', 'finance'];
  return (roles ?? []).filter((role): role is WorkspaceRole =>
    allowed.includes(role as WorkspaceRole),
  );
};

const normalizeWorkspace = (workspace: RawWorkspaceMembershipRow['workspaces']) => {
  if (!workspace) {
    return null;
  }

  return Array.isArray(workspace) ? (workspace[0] ?? null) : workspace;
};

export const hasAnyRole = (roles: WorkspaceRole[], expected: WorkspaceRole[]) =>
  expected.some((role) => roles.includes(role));

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new UnauthorizedError();
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id,roles,status,workspaces(id,name,slug)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    throw new Error(
      `Falha ao carregar workspaces do usuario: ${error.message}`,
    );
  }

  const memberships = (data ?? [])
    .map((row) => ({
      ...row,
      workspaces: normalizeWorkspace((row as RawWorkspaceMembershipRow).workspaces),
    }))
    .filter((row): row is WorkspaceMembershipRow => Boolean(row.workspaces));

  if (memberships.length === 0) {
    throw new MissingWorkspaceError();
  }

  const cookieStore = await cookies();
  const requestedWorkspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  const activeMembership =
    memberships.find(
      (membership) => membership.workspace_id === requestedWorkspaceId,
    ) ?? memberships[0];

  return {
    userId: user.id,
    workspaceId: activeMembership.workspace_id,
    roles: normalizeRoles(activeMembership.roles),
    workspaces: memberships.map((membership) => ({
      id: membership.workspace_id,
      name: membership.workspaces?.name ?? 'Workspace',
      slug: membership.workspaces?.slug ?? 'workspace',
      roles: normalizeRoles(membership.roles),
    })),
  };
}
