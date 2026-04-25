import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { orderService } from "@/server/order-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

const statusLabel = {
  open: "Aberto",
  processing: "Em processamento",
  completed: "Concluido",
  cancelled: "Cancelado",
} as const;

const statusVariant = {
  open: "secondary",
  processing: "default",
  completed: "success",
  cancelled: "destructive",
} as const;

export default async function OrderDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const order = await orderService.getById(id);

  if (!order) {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/95 p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">Pedido {order.orderNumber}</h1>
            <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Cliente: {order.client.name} - Emissao em {formatDate(order.issueDate)}
          </p>
        </section>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead>Valor unitario</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell>{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
