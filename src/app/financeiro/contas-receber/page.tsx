import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { FinanceEntriesTable } from "@/components/finance/finance-entries-table";
import { FinanceSubnav } from "@/components/finance/finance-subnav";

export const dynamic = "force-dynamic";

export default function ContasReceberPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Financeiro"
          description="Controle contas a receber e acompanhe parcelas geradas automaticamente a partir de pedidos convertidos."
          actions={<FinanceSubnav />}
        />

        <FinanceEntriesTable entryType="receivable" />
      </main>
    </AppShell>
  );
}
