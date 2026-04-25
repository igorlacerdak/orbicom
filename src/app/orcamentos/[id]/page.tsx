import { QuoteForm } from "@/components/quote/quote-form";
import { AppShell } from "@/components/layout/app-shell";
import { QuoteStatusBadge } from "@/components/quote/quote-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import { catalogService } from "@/server/catalog-service";
import { quoteService } from "@/server/quote-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const catalogItems = await catalogService.listForQuote();
  const quote = await quoteService.getById(id);

  if (!quote) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Orcamento nao encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique se o orcamento existe no seu navegador ou crie um novo orcamento.
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="flex-1">
        <header className="mx-auto w-full max-w-7xl px-4 pt-8 md:px-8">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Editar Orcamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Orbicom - Gestao comercial de ponta a ponta. Altere os dados e mantenha sua proposta atualizada.
          </p>
        </header>

        <section id="historico" className="mx-auto w-full max-w-7xl px-4 pt-6 md:px-8">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Historico</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status atual</span>
                <QuoteStatusBadge status={quote.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{formatDate(quote.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ultima atualizacao</span>
                <span>{formatDate(quote.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </section>
        <QuoteForm key={quote.id} mode="edit" initialQuote={quote} initialCatalogItems={catalogItems} />
      </main>
    </AppShell>
  );
}
