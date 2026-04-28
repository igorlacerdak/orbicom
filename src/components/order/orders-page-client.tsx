"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineError } from "@/components/ui/inline-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { getQueryMetricsSnapshot, recordQueryCacheHit, recordQueryFetch } from "@/lib/query-metrics";
import { queryKeys } from "@/lib/query-keys";
import type { Order } from "@/domain/order.types";

const METRIC_KEY = "orders";

const orderStatusLabels = {
  awaiting_billing: "Aguardando faturamento",
  billed: "Faturado",
  partially_paid: "Parcialmente pago",
  paid: "Pago",
  cancelled: "Cancelado",
} as const;

const orderStatusVariant = {
  awaiting_billing: "secondary",
  billed: "default",
  partially_paid: "outline",
  paid: "success",
  cancelled: "destructive",
} as const;

const fetchOrders = async (): Promise<Order[]> => {
  recordQueryFetch(METRIC_KEY);
  const response = await fetch("/api/orders");
  const body = (await response.json()) as { data?: Order[]; error?: string };

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Falha ao listar pedidos.");
  }

  return body.data;
};

export function OrdersPageClient() {
  const hasTrackedCacheHit = useRef(false);
  const { data: orders = [], isLoading, isFetching, isFetchedAfterMount, dataUpdatedAt, error, refetch } = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: fetchOrders,
  });

  useEffect(() => {
    if (hasTrackedCacheHit.current || isLoading || isFetching || isFetchedAfterMount) {
      return;
    }

    recordQueryCacheHit(METRIC_KEY);
    hasTrackedCacheHit.current = true;
  }, [isFetchedAfterMount, isFetching, isLoading]);

  const metric = getQueryMetricsSnapshot()[METRIC_KEY];

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Pedidos cadastrados</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Atualizar agora
          </Button>
        </div>
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          Atualizado em {dataUpdatedAt ? formatDateTime(dataUpdatedAt) : "--"} · fetches: {metric?.fetches ?? 0} · cache hits: {metric?.cacheHits ?? 0}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {error ? (
          <InlineError
            message={error instanceof Error ? error.message : "Falha ao listar pedidos."}
            className="mb-4"
          />
        ) : null}

        {isLoading ? (
          <div className="grid gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`orders-skeleton-${index}`} className="h-11 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
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
  );
}
