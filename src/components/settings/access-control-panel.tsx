"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineError, InlineInfo } from "@/components/ui/inline-feedback";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import { formatRoleLabel } from "@/lib/role-labels";

type AccessMember = {
  id: string;
  userId: string;
  label: string;
  roles: string[];
  status: "active" | "disabled";
  joinedAt: string | null;
};

type AccessInvite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
};

type AccessPayload = {
  canManage: boolean;
  members: AccessMember[];
  invites: AccessInvite[];
};

const statusVariant: Record<AccessMember["status"], "default" | "secondary"> = {
  active: "default",
  disabled: "secondary",
};

const inviteStatusVariant: Record<AccessInvite["status"], "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  accepted: "secondary",
  expired: "destructive",
  cancelled: "outline",
};

export function AccessControlPanel() {
  const [data, setData] = useState<AccessPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingMemberId, setIsUpdatingMemberId] = useState<string | null>(null);

  const pendingInvites = useMemo(
    () => (data?.invites ?? []).filter((invite) => invite.status === "pending"),
    [data],
  );

  const fetchAccessData = async () => {
    const response = await fetch("/api/workspaces/access", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Falha ao carregar colaboradores.");
    }

    return payload.data as AccessPayload;
  };

  const loadData = async (options?: { withLoadingState?: boolean }) => {
    const withLoadingState = options?.withLoadingState ?? true;
    if (withLoadingState) {
      setIsLoading(true);
    }

    setError(null);
    try {
      const nextData = await fetchAccessData();
      setData(nextData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar colaboradores.");
    } finally {
      if (withLoadingState) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const nextData = await fetchAccessData();
        if (!isMounted) {
          return;
        }

        setData(nextData);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar colaboradores.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteEmail.trim()) {
      setError("Informe um email para convite.");
      toast.error("Informe um email para convite.");
      return;
    }

    setIsSubmittingInvite(true);
    setError(null);

    try {
      const response = await fetch("/api/workspaces/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail.trim(), expiresInDays }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao criar convite.");
      }

      toast.success(`Convite criado para ${payload.data.email}.`);
      setInviteEmail("");
      await loadData({ withLoadingState: false });
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Falha ao criar convite.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleMemberStatusChange = async (memberId: string, status: "active" | "disabled") => {
    setIsUpdatingMemberId(memberId);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/members/${memberId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao atualizar colaborador.");
      }

      toast.success(
        status === "disabled" ? "Colaborador desativado com sucesso." : "Colaborador reativado com sucesso.",
      );
      await loadData({ withLoadingState: false });
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Falha ao atualizar colaborador.";
      setError(message);
      toast.error(message);
    } finally {
      setIsUpdatingMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Convidar colaborador</CardTitle>
          <CardDescription>
            Novos convites entram sempre como <strong>Operador</strong>. A edicao de papeis permanece desativada nesta versao.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.canManage ? (
            <InlineInfo
              message="Apenas Dono/Administrador podem criar convites ou desativar colaboradores."
            />
          ) : (
            <form onSubmit={handleCreateInvite} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <Input
                type="email"
                placeholder="email@empresa.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
              <Input
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(Number(event.target.value || 7))}
              />
              <Button type="submit" disabled={isSubmittingInvite}>
                {isSubmittingInvite ? "Enviando..." : "Criar convite"}
              </Button>
            </form>
          )}
          {error ? <InlineError message={error} className="mt-3" compact /> : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Colaboradores</CardTitle>
          <CardDescription>Membros ativos e desativados do workspace atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead className="text-right">Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.members ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum colaborador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.members ?? []).map((member) => {
                  const isOperatorOnly = member.roles.length === 1 && member.roles[0] === "operator";
                  const canManageMember = Boolean(data?.canManage && isOperatorOnly);
                  const isUpdating = isUpdatingMemberId === member.id;

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.label}</span>
                          <span className="text-xs text-muted-foreground">{member.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(member.roles.length > 0 ? member.roles : ["operator"]).map((role) => (
                            <Badge key={`${member.id}-${role}`} variant="outline">
                              {formatRoleLabel(role)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[member.status]}>{member.status === "active" ? "Ativo" : "Desativado"}</Badge>
                      </TableCell>
                      <TableCell>{member.joinedAt ? formatDate(member.joinedAt) : "-"}</TableCell>
                      <TableCell className="text-right">
                        {canManageMember ? (
                          <Button
                            size="sm"
                            variant={member.status === "active" ? "outline" : "default"}
                            disabled={isUpdating}
                            onClick={() =>
                              handleMemberStatusChange(
                                member.id,
                                member.status === "active" ? "disabled" : "active",
                              )
                            }
                          >
                            {isUpdating ? "Salvando..." : member.status === "active" ? "Desativar" : "Reativar"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem acao</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Convites</CardTitle>
          <CardDescription>Convites enviados para este workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Sem convites pendentes.
                  </TableCell>
                </TableRow>
              ) : (
                pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant={inviteStatusVariant[invite.status]}>{invite.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                    <TableCell>{formatDate(invite.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
