import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { CatalogManager } from "@/components/catalog/catalog-manager";

export default async function CatalogPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Produtos e servicos"
          description="Cadastre itens para uso rapido em orcamentos, incluindo item padrao 000 com descricao customizavel."
          contentClassName="gap-3"
          descriptionClassName="max-w-3xl text-sm text-muted-foreground"
        />

        <CatalogManager />
      </main>
    </AppShell>
  );
}
