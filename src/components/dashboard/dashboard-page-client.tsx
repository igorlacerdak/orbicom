"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuoteStatus } from "@/domain/quote.types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { getQueryMetricsSnapshot, recordQueryCacheHit, recordQueryFetch } from "@/lib/query-metrics";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardSnapshot } from "@/server/dashboard-service";

const METRIC_KEY = "dashboard";

const quoteStatusVariant = {
  draft: "outline",
  sent: "secondary",
  approved: "default",
  rejected: "destructive",
  converted: "success",
} as const;

const emptySnapshot: DashboardSnapshot = {
  totalRevenue: 0,
  monthRevenue: 0,
  averageTicket: 0,
  quotesCount: 0,
  approvalRate: 0,
  statusCounts: {
    draft: 0,
    sent: 0,
    approved: 0,
    rejected: 0,
    converted: 0,
  },
  topClients: [],
  recentQuotes: [],
};

const fetchDashboard = async (): Promise<DashboardSnapshot> => {
  recordQueryFetch(METRIC_KEY);
  const response = await fetch("/api/dashboard");
  const payload = (await response.json()) as { data?: DashboardSnapshot; error?: string };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "Falha ao carregar dashboard.");
  }

  return payload.data;
};

export function DashboardPageClient() {
  const hasTrackedCacheHit = useRef(false);
  const { data = emptySnapshot, isLoading, isFetching, isFetchedAfterMount, dataUpdatedAt, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: fetchDashboard,
  });

  useEffect(() => {
    if (hasTrackedCacheHit.current || isLoading || isFetching || isFetchedAfterMount) {
      return;
    }

    recordQueryCacheHit(METRIC_KEY);
    hasTrackedCacheHit.current = true;
  }, [isFetchedAfterMount, isFetching, isLoading]);

  const metric = getQueryMetricsSnapshot()[METRIC_KEY];

  if (isLoading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={`dashboard-skeleton-${index}`} className="border-border/70 bg-card/95 shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-6 w-36" />
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  const snapshot = data;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>
          Atualizado em {dataUpdatedAt ? formatDateTime(dataUpdatedAt) : "--"} · fetches: {metric?.fetches ?? 0} · cache hits: {metric?.cacheHits ?? 0}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
          Atualizar agora
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Falha ao carregar dashboard."}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Faturamento total</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(snapshot.totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Faturamento no mes</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(snapshot.monthRevenue)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Ticket medio</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(snapshot.averageTicket)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Total de orcamentos</CardDescription>
            <CardTitle className="text-2xl">{snapshot.quotesCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm md:col-span-2 xl:col-span-4">
          <CardHeader className="pb-3">
            <CardDescription>Taxa de aprovacao</CardDescription>
            <CardTitle className="text-2xl">{snapshot.approvalRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(Object.keys(snapshot.statusCounts) as QuoteStatus[]).map((status) => (
              <Badge key={status} variant={quoteStatusVariant[status]}>
                {status}: {snapshot.statusCounts[status]}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Top 5 clientes por receita</CardTitle>
            <CardDescription>Clientes com maior valor acumulado de propostas</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.topClients.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Sem dados ainda. Crie seu primeiro orcamento para iniciar a analise.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.topClients.map((client) => (
                    <TableRow key={client.name}>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.quotesCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Ultimos orcamentos</CardTitle>
            <CardDescription>Monitoramento rapido da atividade recente</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.recentQuotes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum orcamento encontrado no momento.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {snapshot.recentQuotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/orcamentos/${quote.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3 py-2 hover:bg-muted/40"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{quote.quoteNumber}</span>
                      <span className="text-xs text-muted-foreground">{quote.client.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formatDate(quote.issueDate)}</Badge>
                      <span className="text-sm font-medium">{formatCurrency(quote.totals.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
