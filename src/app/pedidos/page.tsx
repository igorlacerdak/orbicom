import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { OrdersPageClient } from "@/components/order/orders-page-client";

export default async function OrdersPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Pedidos"
          description="Pedidos gerados a partir de propostas aprovadas e convertidas no fluxo comercial."
          contentClassName="gap-3"
          descriptionClassName="max-w-3xl text-sm text-muted-foreground"
        />

        <OrdersPageClient />
      </main>
    </AppShell>
  );
}
