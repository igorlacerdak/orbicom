import { AppShell } from "@/components/layout/app-shell";
import { FinanceEntriesTable } from "@/components/finance/finance-entries-table";
import { FinanceSubnav } from "@/components/finance/finance-subnav";
import { PageHero } from "@/components/layout/page-hero";

export const dynamic = "force-dynamic";

export default function ContasPagarPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Financeiro"
          description="Organize compromissos financeiros e acompanhe obrigações do workspace em um unico lugar."
          actions={<FinanceSubnav />}
        />

        <FinanceEntriesTable entryType="payable" />
      </main>
    </AppShell>
  );
}
