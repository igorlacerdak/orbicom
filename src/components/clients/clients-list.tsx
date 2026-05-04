"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InlineError } from "@/components/ui/inline-feedback";
import { Input } from "@/components/ui/input";
import { PageHero } from "@/components/layout/page-hero";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import { formatDateTime } from "@/lib/formatters";
import type { ClientInput } from "@/domain/client.schema";
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
  const queryClient = useQueryClient();
  const hasTrackedCacheHit = useRef(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientSummary | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [deleteError, setDeleteError] = useState("");

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

  const clientMatchesSearch = (client: ClientSummary, search: string) => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return true;
    }

    return (
      client.name.toLowerCase().includes(normalized) ||
      client.document.toLowerCase().includes(normalized) ||
      client.city.toLowerCase().includes(normalized)
    );
  };

  const applyClientToCache = (nextClient: ClientSummary) => {
    const cachedEntries = queryClient.getQueriesData<ClientSummary[]>({ queryKey: ["clients"] });

    for (const [queryKey, cachedList] of cachedEntries) {
      const [, search = ""] = queryKey as [string, string];
      const currentList = cachedList ?? [];
      const filtered = currentList.filter((client) => client.id !== nextClient.id);

      if (!clientMatchesSearch(nextClient, search)) {
        queryClient.setQueryData(queryKey, filtered);
        continue;
      }

      queryClient.setQueryData(
        queryKey,
        [nextClient, ...filtered].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }

    if (cachedEntries.length === 0) {
      queryClient.setQueryData(queryKeys.clients(""), [nextClient]);
    }
  };

  const removeClientFromCache = (clientId: string) => {
    const cachedEntries = queryClient.getQueriesData<ClientSummary[]>({ queryKey: ["clients"] });

    for (const [queryKey, cachedList] of cachedEntries) {
      queryClient.setQueryData(
        queryKey,
        (cachedList ?? []).filter((client) => client.id !== clientId),
      );
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ payload, clientId }: { payload: ClientInput; clientId?: string }) => {
      const response = await fetch(clientId ? `/api/clients/${clientId}` : "/api/clients", {
        method: clientId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { data?: ClientSummary; error?: string };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Falha ao cadastrar cliente.");
      }

      return body.data;
    },
    onMutate: () => {
      setDialogError("");
    },
    onSuccess: (savedClient) => {
      applyClientToCache(savedClient);
      setIsCreateOpen(false);
      setEditingClient(null);
      setDialogError("");
      toast.success(dialogMode === "edit" ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Falha ao salvar cliente.";
      setDialogError(message);
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      const body = (await response.json()) as { data?: { id: string }; error?: string };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Falha ao excluir cliente.");
      }

      return body.data;
    },
    onMutate: () => {
      setDeleteError("");
    },
    onSuccess: ({ id }) => {
      removeClientFromCache(id);
      setClientToDelete(null);
      toast.success("Cliente excluido com sucesso.");
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Falha ao excluir cliente.";
      setDeleteError(message);
      toast.error(message);
    },
  });

  const handleCreate = () => {
    setDialogMode("create");
    setEditingClient(null);
    setDialogError("");
    setIsCreateOpen(true);
  };

  const handleEdit = (client: ClientSummary) => {
    setDialogMode("edit");
    setEditingClient(client);
    setDialogError("");
    setIsCreateOpen(true);
  };

  const handleSaveClient = async (input: ClientInput) => {
    await saveMutation.mutateAsync({
      payload: input,
      clientId: dialogMode === "edit" ? editingClient?.id : undefined,
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
      <PageHero
        title="Clientes"
        description="Consulte sua base de clientes e encontre registros rapidamente por nome, documento ou cidade."
        descriptionClassName="max-w-2xl text-sm text-muted-foreground"
        actions={
          <div className="flex w-full max-w-3xl flex-col gap-2 md:flex-row md:items-center md:justify-end">
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
            <Button type="button" onClick={handleCreate}>
              <Plus data-icon="inline-start" />
              Novo cliente
            </Button>
          </div>
        }
      />

      <CreateClientDialog
        open={isCreateOpen}
        mode={dialogMode}
        initialClient={editingClient}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingClient(null);
            setDialogError("");
          }
        }}
        onSubmit={handleSaveClient}
        loading={saveMutation.isPending}
        error={dialogError}
      />

      <Dialog
        open={Boolean(clientToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setClientToDelete(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
            <DialogDescription>
              Confirme a exclusao de {clientToDelete?.name}. Essa acao remove o cadastro e o endereco principal.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <InlineError message={deleteError} compact /> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleteMutation.isPending} onClick={() => setClientToDelete(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!clientToDelete || deleteMutation.isPending}
              onClick={() => clientToDelete && deleteMutation.mutate(clientToDelete.id)}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{resultLabel}</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              Atualizar agora
            </Button>
          </div>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            Atualizado em {dataUpdatedAt ? formatDateTime(dataUpdatedAt) : "--"} · fetches: {metric?.fetches ?? 0} · cache hits: {metric?.cacheHits ?? 0}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {errorMessage ? (
            <InlineError message={errorMessage} className="mb-4" />
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
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
                      <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-10" /></TableCell>
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Acoes para ${client.name}`}>
                                <MoreHorizontal />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => handleEdit(client)}>
                                <Pencil />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setClientToDelete(client)}>
                                <Trash2 />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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
