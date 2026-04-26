import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { AccessControlPanel } from "@/components/settings/access-control-panel";

export const dynamic = "force-dynamic";

export default function ConfiguracoesAcessoPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Controle de acesso"
          description="Convide novos colaboradores como Operador e gerencie o status de acesso dentro do workspace ativo."
        />

        <AccessControlPanel />
      </main>
    </AppShell>
  );
}
