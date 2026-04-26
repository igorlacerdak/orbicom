'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { QuoteStatusActions } from '@/components/quote/quote-status-actions';
import { QuoteStatusBadge } from '@/components/quote/quote-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Quote } from '@/domain/quote.types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import {
  getQueryMetricsSnapshot,
  recordQueryCacheHit,
  recordQueryFetch,
} from '@/lib/query-metrics';
import { queryKeys } from '@/lib/query-keys';

const METRIC_KEY = 'quotes';

const fetchQuotes = async (): Promise<Quote[]> => {
  recordQueryFetch(METRIC_KEY);
  const response = await fetch('/api/quotes');
  const body = (await response.json()) as { data?: Quote[]; error?: string };

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? 'Falha ao carregar orcamentos.');
  }

  return body.data;
};

export function QuotesPageClient() {
  const hasTrackedCacheHit = useRef(false);
  const {
    data: quotes = [],
    isLoading,
    isFetching,
    isFetchedAfterMount,
    dataUpdatedAt,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.quotes(),
    queryFn: fetchQuotes,
  });

  useEffect(() => {
    if (
      hasTrackedCacheHit.current ||
      isLoading ||
      isFetching ||
      isFetchedAfterMount
    ) {
      return;
    }

    recordQueryCacheHit(METRIC_KEY);
    hasTrackedCacheHit.current = true;
  }, [isFetchedAfterMount, isFetching, isLoading]);

  const metric = getQueryMetricsSnapshot()[METRIC_KEY];

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Propostas e orcamentos salvos</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
          >
            Atualizar agora
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Atualizado em {dataUpdatedAt ? formatDateTime(dataUpdatedAt) : '--'} ·
          fetches: {metric?.fetches ?? 0} · cache hits: {metric?.cacheHits ?? 0}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : 'Falha ao carregar orcamentos.'}
          </p>
        ) : null}

        {isLoading ? (
          <div className="grid gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton
                key={`quotes-skeleton-${index}`}
                className="h-11 w-full"
              />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum orcamento salvo ainda. Clique em &quot;Novo orcamento&quot;
            para comecar.
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
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>{quote.quoteNumber}</TableCell>
                  <TableCell>{quote.client.name}</TableCell>
                  <TableCell>
                    <QuoteStatusBadge status={quote.status} />
                  </TableCell>
                  <TableCell>{formatDate(quote.issueDate)}</TableCell>
                  <TableCell>{formatCurrency(quote.totals.total)}</TableCell>
                  <TableCell className="text-right">
                    <QuoteStatusActions
                      quoteId={quote.id}
                      status={quote.status}
                    />
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
