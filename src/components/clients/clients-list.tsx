"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import { formatDateTime } from "@/lib/formatters";
import { getQueryMetricsSnapshot, recordQueryCacheHit, recordQueryFetch } from "@/lib/query-metrics";
import { queryKeys } from "@/lib/query-keys";
import type { ClientSummary } from "@/server/client-service";

const METRIC_KEY = "clients";

const fetchClients = async (search: string): Promise<ClientSummary[]> => {
  recordQueryFetch(METRIC_KEY);
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("q", search.trim());
  }

  const response = await fetch(`/api/clients?${params.toString()}`);
  const body = (await response.json()) as { data?: ClientSummary[]; error?: string };

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Falha ao listar clientes.");
  }

  return body.data;
};

export function ClientsList() {
  const hasTrackedCacheHit = useRef(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching, isFetchedAfterMount, dataUpdatedAt, error, refetch } = useQuery({
    queryKey: queryKeys.clients(debouncedQuery),
    queryFn: () => fetchClients(debouncedQuery),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (hasTrackedCacheHit.current || isLoading || isFetching || isFetchedAfterMount) {
      return;
    }

    recordQueryCacheHit(METRIC_KEY);
    hasTrackedCacheHit.current = true;
  }, [isFetchedAfterMount, isFetching, isLoading]);

  const clients = data ?? [];
  const loading = isLoading || isFetching;
  const errorMessage = error instanceof Error ? error.message : "";
  const resultLabel = useMemo(
    () => (debouncedQuery ? `Resultados para \"${debouncedQuery}\"` : "Clientes cadastrados"),
    [debouncedQuery],
  );
  const metric = getQueryMetricsSnapshot()[METRIC_KEY];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
      <PageHero
        title="Clientes"
        description="Consulte sua base de clientes e encontre registros rapidamente por nome, documento ou cidade."
        descriptionClassName="max-w-2xl text-sm text-muted-foreground"
        actions={
          <div className="flex w-full max-w-md items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, documento ou cidade"
            />
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              <Search data-icon="inline-start" />
              Buscar
            </Button>
          </div>
        }
      />

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{resultLabel}</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              Atualizar agora
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Atualizado em {dataUpdatedAt ? formatDateTime(dataUpdatedAt) : "--"} · fetches: {metric?.fetches ?? 0} · cache hits: {metric?.cacheHits ?? 0}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {errorMessage ? (
            <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`clients-skeleton-${index}`}>
                      <TableCell><Skeleton className="h-4 w-52" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                : null}
              {!loading
                ? clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.document}</TableCell>
                      <TableCell>{`${client.city} - ${client.state}`}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{formatDate(client.updatedAt)}</TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>

          {!loading && clients.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado para o filtro atual.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Link href="/orcamentos/novo" className="inline-flex">
          <Button>Novo orcamento</Button>
        </Link>
      </div>
    </main>
  );
}
