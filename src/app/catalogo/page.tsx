import { AppShell } from "@/components/layout/app-shell";
import { CatalogManager } from "@/components/catalog/catalog-manager";
import { catalogService } from "@/server/catalog-service";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const initialItems = await catalogService.list({ type: "all", active: true });

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 right-0 size-52 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex flex-col gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Produtos e servicos</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Cadastre itens para uso rapido em orcamentos, incluindo item padrao 000 com descricao customizavel.
            </p>
          </div>
        </section>

        <CatalogManager initialItems={initialItems} />
      </main>
    </AppShell>
  );
}
