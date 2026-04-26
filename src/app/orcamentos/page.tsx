import { AppShell } from '@/components/layout/app-shell';
import { PageHero } from '@/components/layout/page-hero';
import { QuotesPageClient } from '@/components/quote/quotes-page-client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function QuotesPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Orbicom"
          description="Gestao comercial de ponta a ponta para propostas, orcamentos e evolucao para pedidos."
          descriptionClassName="max-w-2xl text-sm text-muted-foreground"
          actions={
            <Link href="/orcamentos/novo" className="inline-flex">
              <Button>
                <Plus />
                Novo orcamento
              </Button>
            </Link>
          }
        />
        <QuotesPageClient />
      </main>
    </AppShell>
  );
}
