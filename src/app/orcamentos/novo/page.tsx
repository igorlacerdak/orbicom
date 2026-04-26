import { QuoteForm } from "@/components/quote/quote-form";
import { AppShell } from "@/components/layout/app-shell";
import { InlineError } from "@/components/ui/inline-feedback";
import { buildDraftQuote } from "@/domain/quote.defaults";
import { catalogService } from "@/server/catalog-service";
import { quoteService } from "@/server/quote-service";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const catalogItems = await catalogService.listForQuote();
  let draft = buildDraftQuote(1);
  let loadError = "";

  try {
    draft = await quoteService.createDraft();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Falha ao montar rascunho inicial.";
  }

  return (
    <AppShell>
      <main className="flex-1">
        <header className="mx-auto w-full max-w-7xl px-4 pt-8 md:px-8">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Novo Orcamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Orbicom - Gestao comercial de ponta a ponta. Preencha os dados para gerar a proposta.
          </p>
        </header>
        {loadError ? (
          <InlineError
            message={loadError}
            className="mx-auto mt-4 w-full max-w-7xl px-4 py-3 md:px-8"
          />
        ) : null}
        <QuoteForm key={draft.quoteNumber} mode="create" initialQuote={draft} initialCatalogItems={catalogItems} />
      </main>
    </AppShell>
  );
}
