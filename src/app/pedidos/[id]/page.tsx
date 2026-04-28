import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { OrderEditor } from "@/components/order/order-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { orderService } from "@/server/order-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const order = await orderService.getById(id);

  if (!order) {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <OrderEditor order={order} />

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Resumo financeiro</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Desconto</span>
              <span>- {formatCurrency(order.totals.discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{formatCurrency(order.totals.freight)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Impostos</span>
              <span>{formatCurrency(order.totals.taxAmount)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.totals.total)}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
