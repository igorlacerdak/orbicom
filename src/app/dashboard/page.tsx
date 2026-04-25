import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { dashboardService } from "@/server/dashboard-service";

const quoteStatusVariant = {
  draft: "outline",
  sent: "secondary",
  approved: "default",
  rejected: "destructive",
  converted: "success",
} as const;

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await dashboardService.getSnapshot();

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 right-0 size-52 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex flex-col gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Visao consolidada da operacao comercial com faturamento, ranking de clientes e ultimas propostas.
            </p>
          </div>
        </section>

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
              <Badge variant={quoteStatusVariant.draft}>Rascunho: {snapshot.statusCounts.draft}</Badge>
              <Badge variant={quoteStatusVariant.sent}>Enviado: {snapshot.statusCounts.sent}</Badge>
              <Badge variant={quoteStatusVariant.approved}>Aprovado: {snapshot.statusCounts.approved}</Badge>
              <Badge variant={quoteStatusVariant.rejected}>Recusado: {snapshot.statusCounts.rejected}</Badge>
              <Badge variant={quoteStatusVariant.converted}>Convertido: {snapshot.statusCounts.converted}</Badge>
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
      </main>
    </AppShell>
  );
}
