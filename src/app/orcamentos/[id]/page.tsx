import { QuoteForm } from "@/components/quote/quote-form";
import { AppShell } from "@/components/layout/app-shell";
import { quoteService } from "@/server/quote-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;
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
        <QuoteForm key={quote.id} mode="edit" initialQuote={quote} />
      </main>
    </AppShell>
  );
}
