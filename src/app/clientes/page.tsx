import Link from "next/link";
import { Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import { clientService } from "@/server/client-service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ClientsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const search = (q ?? "").trim();
  const clients = await clientService.list(search);

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 right-0 size-52 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Clientes</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Consulte sua base de clientes e encontre registros rapidamente por nome, documento ou cidade.
              </p>
            </div>

            <form action="/clientes" className="flex w-full max-w-md items-center gap-2">
              <Input
                name="q"
                defaultValue={search}
                placeholder="Buscar por nome, documento ou cidade"
              />
              <Button type="submit" variant="outline">
                <Search data-icon="inline-start" />
                Buscar
              </Button>
            </form>
          </div>
        </section>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Clientes cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {clients.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado para o filtro atual.
              </p>
            ) : (
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
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.document}</TableCell>
                      <TableCell>{`${client.city} - ${client.state}`}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{formatDate(client.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end">
          <Link href="/orcamentos/novo" className="inline-flex">
            <Button>Novo orcamento</Button>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
