import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { orderService } from "@/server/order-service";

export const dynamic = "force-dynamic";

const orderStatusLabels = {
  open: "Aberto",
  processing: "Em processamento",
  completed: "Concluido",
  cancelled: "Cancelado",
} as const;

const orderStatusVariant = {
  open: "secondary",
  processing: "default",
  completed: "success",
  cancelled: "destructive",
} as const;

export default async function OrdersPage() {
  let errorMessage = "";
  let orders = [] as Awaited<ReturnType<typeof orderService.list>>;

  try {
    orders = await orderService.list();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Falha ao listar pedidos.";
  }

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 right-0 size-52 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Pedidos</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Pedidos gerados a partir de propostas aprovadas e convertidas no fluxo comercial.
            </p>
          </div>
        </section>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Pedidos cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {errorMessage ? (
              <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            {orders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhum pedido ainda. Aprove um orcamento e converta para pedido.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{order.client.name}</TableCell>
                      <TableCell>
                        <Badge variant={orderStatusVariant[order.status]}>{orderStatusLabels[order.status]}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.issueDate)}</TableCell>
                      <TableCell>{formatCurrency(order.totals.total)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/pedidos/${order.id}`} className="inline-flex">
                          <Button type="button" variant="outline" size="sm">
                            Abrir
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
