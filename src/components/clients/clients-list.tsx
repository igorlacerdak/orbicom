"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import type { ClientSummary } from "@/server/client-service";

type ClientsListProps = {
  initialClients: ClientSummary[];
  initialError?: string;
};

export function ClientsList({ initialClients, initialError = "" }: ClientsListProps) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientSummary[]>(initialClients);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchClients = useCallback(async (search: string) => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }

    const response = await fetch(`/api/clients?${params.toString()}`, { cache: "no-store" });
    const body = (await response.json()) as { data?: ClientSummary[]; error?: string };

    if (!response.ok || !body.data) {
      setError(body.error ?? "Falha ao listar clientes.");
      setLoading(false);
      return;
    }

    setClients(body.data);
    setLoading(false);
  }, []);

  const onSearchChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void fetchClients(value);
    }, 300);
  };

  return (
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

          <div className="flex w-full max-w-md items-center gap-2">
            <Input
              value={query}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome, documento ou cidade"
            />
            <Button type="button" variant="outline" onClick={() => void fetchClients(query)}>
              <Search data-icon="inline-start" />
              Buscar
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Clientes cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {error ? (
            <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
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
