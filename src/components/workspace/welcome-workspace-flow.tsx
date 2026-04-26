"use client";

import { FormEvent, useState } from "react";
import { Building2, MailPlus } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function WelcomeWorkspaceFlow() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyName.trim()) {
      toast.error("Informe o nome da empresa para continuar.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: companyName.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao criar empresa/workspace.");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Falha ao criar empresa/workspace.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteToken.trim()) {
      toast.error("Cole o token do convite para participar de uma empresa.");
      return;
    }

    setIsJoining(true);

    try {
      const response = await fetch("/api/workspaces/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: inviteToken.trim() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao aceitar convite.");
      }

      toast.success(`Convite aceito em ${payload.data.workspaceName}.`);
      router.push("/dashboard");
      router.refresh();
    } catch (joinError) {
      toast.error(joinError instanceof Error ? joinError.message : "Falha ao aceitar convite.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="size-5" />
            Criar empresa
          </CardTitle>
          <CardDescription>Inicie um workspace novo e configure tudo com onboarding guiado.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-3">
            <Input
              placeholder="Nome da empresa"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
            />
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Criando workspace..." : "Criar e configurar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MailPlus className="size-5" />
            Participar de empresa
          </CardTitle>
          <CardDescription>
            Cole o token do convite enviado por email ou abra o link de convite para entrar automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="flex flex-col gap-3">
            <Input
              placeholder="Token do convite"
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              required
            />
            <Button type="submit" variant="outline" disabled={isJoining}>
              {isJoining ? "Aceitando convite..." : "Participar com convite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
