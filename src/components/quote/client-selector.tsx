"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, UserRound, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { CreateClientDialog } from "@/components/clients/create-client-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputSearch } from "@/components/ui/input-search";
import { InlineError } from "@/components/ui/inline-feedback";
import type { ClientInput } from "@/domain/client.schema";
import type { QuoteFormInput } from "@/domain/quote.schema";
import { queryKeys } from "@/lib/query-keys";
import type { ClientSummary } from "@/server/client-service";

type ClientSelectorProps = {
  form: UseFormReturn<QuoteFormInput>;
  errors: FieldErrors<QuoteFormInput>;
};

const fetchClients = async (search: string): Promise<ClientSummary[]> => {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("q", search.trim());
  }

  const response = await fetch(`/api/clients?${params.toString()}`);
  const body = (await response.json()) as { data?: ClientSummary[]; error?: string };

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Falha ao carregar clientes.");
  }

  return body.data;
};

const addressToQuoteText = (client: ClientSummary) =>
  [
    client.address.street,
    client.address.number,
    client.address.complement,
    client.address.district,
  ]
    .filter(Boolean)
    .join(", ");

const applyClientToQuote = (
  form: UseFormReturn<QuoteFormInput>,
  client: ClientSummary,
) => {
  form.setValue("client.name", client.name, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.document", client.document, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.stateRegistration", client.stateRegistration, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.phone", client.phone, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.address", addressToQuoteText(client), {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.zipCode", client.address.zipCode, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.city", client.address.city, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.state", client.address.state, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
};

const clearClientFromQuote = (form: UseFormReturn<QuoteFormInput>) => {
  form.setValue("client.name", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.document", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.stateRegistration", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.phone", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.address", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.zipCode", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.city", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  form.setValue("client.state", "", {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
};

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

export function ClientSelector({ form, errors }: ClientSelectorProps) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const currentClientDocument = form.watch("client.document");

  const {
    data: clients = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.clients(debouncedSearch),
    queryFn: () => fetchClients(debouncedSearch),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  const matchedClient = useMemo(
    () =>
      selectedClient ??
      clients.find((client) => client.id === selectedClientId) ??
      clients.find((client) => client.document === currentClientDocument),
    [clients, currentClientDocument, selectedClient, selectedClientId],
  );
  const loadError = error instanceof Error ? error.message : "";

  const createMutation = useMutation({
    mutationFn: async (payload: ClientInput) => {
      const response = await fetch("/api/clients", {
        method: "POST",
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
      setCreateError("");
    },
    onSuccess: (createdClient) => {
      const cachedEntries = queryClient.getQueriesData<ClientSummary[]>({ queryKey: ["clients"] });

      for (const [queryKey, cachedList] of cachedEntries) {
        const [, search = ""] = queryKey as [string, string];
        const currentList = cachedList ?? [];
        const withoutClient = currentList.filter((client) => client.id !== createdClient.id);

        queryClient.setQueryData(
          queryKey,
          clientMatchesSearch(createdClient, search)
            ? [createdClient, ...withoutClient].sort((a, b) => a.name.localeCompare(b.name))
            : withoutClient,
        );
      }

      if (cachedEntries.length === 0) {
        queryClient.setQueryData(queryKeys.clients(""), [createdClient]);
      }

      setSelectedClientId(createdClient.id);
      setSelectedClient(createdClient);
      setSearch(createdClient.name);
      setDebouncedSearch(createdClient.name);
      applyClientToQuote(form, createdClient);
      setIsCreateOpen(false);
      toast.success("Cliente cadastrado e selecionado.");
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Falha ao cadastrar cliente.";
      setCreateError(message);
      toast.error(message);
    },
  });

  const handleSelectClient = (client: ClientSummary) => {
    setSelectedClientId(client.id);
    setSelectedClient(client);
    setSearch(client.name);
    setDebouncedSearch(client.name);
    applyClientToQuote(form, client);
  };

  const handleClearClient = () => {
    setSelectedClientId("");
    setSelectedClient(null);
    setSearch("");
    setDebouncedSearch("");
    clearClientFromQuote(form);
  };

  return (
    <>
      <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Dados do cliente</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw data-icon="inline-start" />
                Atualizar
              </Button>
              <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus data-icon="inline-start" />
                Novo cliente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Cliente</FieldLabel>
              <FieldContent>
                <InputSearch
                  value={search}
                  onValueChange={setSearch}
                  results={clients}
                  getItemKey={(client) => client.id}
                  renderItem={(client) => (
                    <>
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {client.document} - {client.city}/{client.state}
                      </span>
                    </>
                  )}
                  onSelect={handleSelectClient}
                  loading={isLoading || isFetching}
                  placeholder="Buscar por nome, CPF ou CNPJ"
                  emptyMessage="Nenhum cliente encontrado para a busca atual."
                  searchLabel="Buscar cliente"
                  onSearch={() => {
                    setDebouncedSearch(search.trim());
                    void refetch();
                  }}
                />
                <FieldError>{errors.client?.name?.message}</FieldError>
              </FieldContent>
            </Field>
          </FieldGroup>

          {loadError ? <InlineError message={loadError} compact /> : null}

          {matchedClient ? (
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm md:grid-cols-[1fr_auto]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 md:col-span-2">
                  <UserRound />
                  <span className="font-medium">{matchedClient.name}</span>
                </div>
                <p className="text-muted-foreground">CNPJ/CPF: {matchedClient.document}</p>
                <p className="text-muted-foreground">Telefone: {matchedClient.phone}</p>
                <p className="text-muted-foreground md:col-span-2">
                  {addressToQuoteText(matchedClient)}
                </p>
                <p className="text-muted-foreground">
                  {matchedClient.address.city} - {matchedClient.address.state}
                </p>
                <p className="text-muted-foreground">CEP: {matchedClient.address.zipCode}</p>
              </div>
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={handleClearClient}
                  aria-label="Remover cliente selecionado"
                >
                  <X />
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Selecione um cliente cadastrado para preencher os dados do orcamento.
            </p>
          )}
        </CardContent>
      </Card>

      <CreateClientDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setCreateError("");
          }
        }}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
        }}
        loading={createMutation.isPending}
        error={createError}
      />
    </>
  );
}
