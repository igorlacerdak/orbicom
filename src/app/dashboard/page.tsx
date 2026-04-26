import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default async function DashboardPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Dashboard"
          description="Visao consolidada da operacao comercial com faturamento, ranking de clientes e ultimas propostas."
          contentClassName="gap-3"
          descriptionClassName="max-w-3xl text-sm text-muted-foreground"
        />

        <DashboardPageClient />
      </main>
    </AppShell>
  );
}
