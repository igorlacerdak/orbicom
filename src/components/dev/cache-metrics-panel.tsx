"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import { getQueryMetricsSnapshot } from "@/lib/query-metrics";

type MetricsSnapshot = ReturnType<typeof getQueryMetricsSnapshot>;

const STORAGE_KEY = "orbicom_query_metrics";

export function CacheMetricsPanel() {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot>({});
  const [updatedAt, setUpdatedAt] = useState<number>(0);

  useEffect(() => {
    const sync = () => {
      setSnapshot(getQueryMetricsSnapshot());
      setUpdatedAt(Date.now());
    };

    sync();
    const timer = setInterval(sync, 1500);

    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      Object.entries(snapshot)
        .map(([key, metric]) => ({
          key,
          fetches: metric.fetches,
          cacheHits: metric.cacheHits,
          total: metric.fetches + metric.cacheHits,
          hitRate: metric.fetches + metric.cacheHits > 0 ? (metric.cacheHits / (metric.fetches + metric.cacheHits)) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
    [snapshot],
  );

  const totals = useMemo(() => {
    const fetches = rows.reduce((acc, row) => acc + row.fetches, 0);
    const cacheHits = rows.reduce((acc, row) => acc + row.cacheHits, 0);
    const total = fetches + cacheHits;
    return {
      fetches,
      cacheHits,
      total,
      hitRate: total > 0 ? (cacheHits / total) * 100 : 0,
    };
  }, [rows]);

  const resetMetrics = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      (window as typeof window & { __orbicomQueryMetrics?: MetricsSnapshot }).__orbicomQueryMetrics = {};
    }
    setSnapshot({});
    setUpdatedAt(Date.now());
  };

  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Painel de cache</CardTitle>
              <CardDescription>
                Sessao atual do navegador. Atualiza automaticamente a cada 1.5s.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={resetMetrics}>
              Limpar metricas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p className="text-muted-foreground">Ultima leitura: {formatDateTime(updatedAt)}</p>
          <div className="flex flex-wrap gap-4">
            <span>Fetches: {totals.fetches}</span>
            <span>Cache hits: {totals.cacheHits}</span>
            <span>Hit rate global: {totals.hitRate.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Metricas por modulo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modulo</TableHead>
                <TableHead>Fetches</TableHead>
                <TableHead>Cache hits</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Hit rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Sem metricas ainda. Navegue nas telas com React Query para gerar dados.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.key}</TableCell>
                    <TableCell>{row.fetches}</TableCell>
                    <TableCell>{row.cacheHits}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell className="text-right">{row.hitRate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
