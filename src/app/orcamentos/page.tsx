import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { QuoteStatusActions } from "@/components/quote/quote-status-actions";
import { QuoteStatusBadge } from "@/components/quote/quote-status-badge";
import { Quote } from "@/domain/quote.types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { quoteService } from "@/server/quote-service";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  let quotes: Quote[] = [];
  let loadError = "";

  try {
    quotes = await quoteService.list();
  } catch (error) {
    quotes = [];
    loadError = error instanceof Error ? error.message : "Falha ao carregar orcamentos.";
  }

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-0 h-52 w-52 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Orbicom</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestao comercial de ponta a ponta para propostas, orcamentos e evolucao para pedidos.
            </p>
          </div>

          <Link href="/orcamentos/novo" className="inline-flex">
            <Button>
              <Plus />
              Novo orcamento
            </Button>
          </Link>
        </div>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Propostas e orcamentos salvos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loadError ? (
            <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {loadError}
            </p>
          ) : null}

          {quotes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum orcamento salvo ainda. Clique em &quot;Novo orcamento&quot; para comecar.
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
                      <QuoteStatusActions quoteId={quote.id} status={quote.status} />
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
