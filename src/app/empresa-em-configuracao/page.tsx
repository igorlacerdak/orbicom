import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";

export const dynamic = "force-dynamic";

export default function EmpresaEmConfiguracaoPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Empresa em configuracao"
          description="O workspace ativo ainda esta em onboarding. Quando o Dono ou Administrador finalizar a configuracao, o acesso comercial sera liberado para voce automaticamente."
        />
      </main>
    </AppShell>
  );
}
