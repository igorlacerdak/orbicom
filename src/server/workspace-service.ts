import { randomUUID } from "node:crypto";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { getWorkspaceContext, hasAnyRole } from "@/server/workspace-context";
import type { WorkspaceRole } from "@/server/workspace-context";
import { createClient } from "@/utils/supabase/server";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  roles: string[];
  isActive: boolean;
};

type AcceptedInvite = {
  workspaceId: string;
  workspaceName: string;
};

type WorkspaceMember = {
  id: string;
  userId: string;
  label: string;
  roles: string[];
  status: "active" | "disabled";
  joinedAt: string | null;
};

type WorkspaceInvite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
};

type AccessSnapshot = {
  canManage: boolean;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
};

const buildMemberLabel = (userId: string) => `Usuario ${userId.slice(0, 8)}`;

const assertCanManageAccess = (roles: WorkspaceRole[]) => {
  if (!hasAnyRole(roles, ["owner", "admin"])) {
    throw new ForbiddenError("Apenas owner/admin podem gerenciar colaboradores.");
  }
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const workspaceService = {
  async createWorkspace(input: { name: string }) {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new UnauthorizedError();
    }

    const name = input.name.trim();
    if (!name) {
      throw new Error("Informe o nome da empresa.");
    }

    const baseSlug = slugify(name) || `workspace-${Date.now().toString(36)}`;
    const slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        name,
        slug,
        created_by: user.id,
        is_personal: false,
      })
      .select("id,name,slug")
      .single();

    if (workspaceError) {
      throw new Error(`Falha ao criar empresa/workspace: ${workspaceError.message}`);
    }

    const { error: membershipError } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      roles: ["owner", "admin", "operator", "finance"],
      status: "active",
      joined_at: new Date().toISOString(),
    });

    if (membershipError) {
      throw new Error(`Falha ao vincular usuario ao workspace: ${membershipError.message}`);
    }

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
    };
  },

  async list(): Promise<{ activeWorkspaceId: string | null; workspaces: WorkspaceSummary[] }> {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new UnauthorizedError();
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id,roles,status,workspaces(id,name,slug)")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (error) {
      throw new Error(`Falha ao listar workspaces do usuario: ${error.message}`);
    }

    const memberships = (data ?? []).map((row) => {
      const workspace = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
      return {
        workspaceId: row.workspace_id,
        roles: row.roles ?? [],
        workspace,
      };
    });

    const activeWorkspaceId = memberships[0]?.workspaceId ?? null;

    return {
      activeWorkspaceId,
      workspaces: memberships
        .filter((membership) => membership.workspace)
        .map((membership) => ({
          id: membership.workspaceId,
          name: membership.workspace?.name ?? "Workspace",
          slug: membership.workspace?.slug ?? "workspace",
          roles: membership.roles,
          isActive: membership.workspaceId === activeWorkspaceId,
        }))
        .sort((a, b) => Number(b.isActive) - Number(a.isActive)),
    };
  },

  async assertMembership(workspaceId: string) {
    const workspace = await getWorkspaceContext();
    const isMember = workspace.workspaces.some((item) => item.id === workspaceId);
    if (!isMember) {
      throw new ForbiddenError("Workspace informado nao pertence ao usuario autenticado.");
    }

    return workspace;
  },

  async getAccessSnapshot(): Promise<AccessSnapshot> {
    const context = await getWorkspaceContext();
    const supabase = await createClient();

    const [{ data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("id,user_id,roles,status,joined_at")
        .eq("workspace_id", context.workspaceId)
        .in("status", ["active", "disabled"])
        .order("created_at", { ascending: false }),
      supabase
        .from("workspace_invites")
        .select("id,email,status,expires_at,created_at")
        .eq("workspace_id", context.workspaceId)
        .order("created_at", { ascending: false }),
    ]);

    if (membersError) {
      throw new Error(`Falha ao carregar membros do workspace: ${membersError.message}`);
    }

    if (invitesError) {
      throw new Error(`Falha ao carregar convites do workspace: ${invitesError.message}`);
    }

    return {
      canManage: hasAnyRole(context.roles, ["owner", "admin"]),
      members: (members ?? []).map((member) => ({
        id: member.id,
        userId: member.user_id,
        label: buildMemberLabel(member.user_id),
        roles: member.roles ?? [],
        status: member.status,
        joinedAt: member.joined_at,
      })),
      invites: (invites ?? []).map((invite) => ({
        id: invite.id,
        email: invite.email,
        status: invite.status,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      })),
    };
  },

  async createInvite(input: { email: string; expiresInDays?: number }) {
    const context = await getWorkspaceContext();
    assertCanManageAccess(context.roles);

    const supabase = await createClient();
    const email = normalizeEmail(input.email);
    if (!email) {
      throw new Error("Informe um email valido.");
    }

    const expiresInDays = Math.max(1, Math.min(input.expiresInDays ?? 7, 30));
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const token = randomUUID();

    const { data, error } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_id: context.workspaceId,
        email,
        roles: ["operator"],
        token,
        status: "pending",
        expires_at: expiresAt,
        invited_by: context.userId,
      })
      .select("id,email,status,expires_at,created_at")
      .single();

    if (error) {
      throw new Error(`Falha ao criar convite: ${error.message}`);
    }

    return {
      id: data.id,
      email: data.email,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  },

  async acceptInvite(token: string): Promise<AcceptedInvite> {
    const supabase = await createClient();
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      throw new Error("Token de convite ausente.");
    }

    const { data, error } = await supabase.rpc("accept_workspace_invite", {
      p_token: trimmedToken,
    });

    if (error) {
      throw new Error(`Falha ao aceitar convite: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    const workspaceId = row?.workspace_id as string | undefined;
    const workspaceName = row?.workspace_name as string | undefined;

    if (!workspaceId) {
      throw new Error("Nao foi possivel determinar o workspace do convite.");
    }

    return {
      workspaceId,
      workspaceName: workspaceName ?? "Workspace",
    };
  },

  async updateMemberStatus(memberId: string, status: "active" | "disabled") {
    const context = await getWorkspaceContext();
    assertCanManageAccess(context.roles);

    const supabase = await createClient();
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("id,user_id,roles,status")
      .eq("workspace_id", context.workspaceId)
      .eq("id", memberId)
      .maybeSingle();

    if (memberError) {
      throw new Error(`Falha ao localizar membro: ${memberError.message}`);
    }

    if (!member) {
      throw new Error("Membro nao encontrado no workspace ativo.");
    }

    if (member.user_id === context.userId && status === "disabled") {
      throw new ForbiddenError("Voce nao pode desativar seu proprio acesso.");
    }

    if ((member.roles ?? []).some((role: string) => role === "owner" || role === "admin")) {
      throw new ForbiddenError("A desativacao de owner/admin nao esta habilitada nesta versao.");
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", context.workspaceId)
      .eq("id", memberId)
      .select("id,user_id,roles,status,joined_at")
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar status do membro: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      label: buildMemberLabel(data.user_id),
      roles: data.roles ?? [],
      status: data.status,
      joinedAt: data.joined_at,
    } satisfies WorkspaceMember;
  },
};

export type { AccessSnapshot, WorkspaceInvite, WorkspaceMember, WorkspaceSummary };
