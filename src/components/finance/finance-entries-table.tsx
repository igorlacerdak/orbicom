"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilterX, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineError, InlineInfo } from "@/components/ui/inline-feedback";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import type { FinanceEntryStatus, FinanceEntrySummary } from "@/server/finance-service";

const statusLabelMap: Record<FinanceEntrySummary["status"], string> = {
  open: "Aberto",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const statusVariantMap: Record<FinanceEntrySummary["status"], "outline" | "secondary" | "success" | "destructive"> = {
  open: "outline",
  partial: "secondary",
  paid: "success",
  overdue: "destructive",
  cancelled: "destructive",
};

type FinancePaymentMethod = "a_vista" | "boleto" | "pix" | "cartao_credito";

const receivableStatusOptions: Array<{ value: FinanceEntryStatus; label: string }> = [
  { value: "open", label: "Aberto" },
  { value: "partial", label: "Parcial" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Vencido" },
  { value: "cancelled", label: "Cancelado" },
];

const paymentMethodOptions: Array<{ value: FinancePaymentMethod; label: string }> = [
  { value: "a_vista", label: "A vista" },
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartao de Credito" },
];

const paymentMethodLabelMap: Record<FinancePaymentMethod, string> = {
  a_vista: "A vista",
  boleto: "Boleto",
  pix: "Pix",
  cartao_credito: "Cartao de Credito",
};

type FinanceEntriesTableProps = {
  entryType: "receivable" | "payable";
};

type ReceivableFilters = {
  order: string;
  client: string;
  statuses: FinanceEntryStatus[];
  paymentMethods: FinancePaymentMethod[];
};

const parseFiltersFromSearchParams = (searchParams: URLSearchParams): ReceivableFilters => {
  const statusValues = new Set(receivableStatusOptions.map((item) => item.value));
  const paymentValues = new Set(paymentMethodOptions.map((item) => item.value));

  const parsedStatuses = (searchParams.get("statuses") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is FinanceEntryStatus => statusValues.has(value as FinanceEntryStatus));

  const parsedPaymentMethods = (searchParams.get("paymentMethods") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is FinancePaymentMethod => paymentValues.has(value as FinancePaymentMethod));

  return {
    order: searchParams.get("order") ?? "",
    client: searchParams.get("client") ?? "",
    statuses: parsedStatuses.length > 0 ? parsedStatuses : receivableStatusOptions.map((status) => status.value),
    paymentMethods: parsedPaymentMethods.length > 0 ? parsedPaymentMethods : paymentMethodOptions.map((method) => method.value),
  };
};

const areFiltersEqual = (a: ReceivableFilters, b: ReceivableFilters): boolean => {
  const aStatuses = [...a.statuses].sort().join(",");
  const bStatuses = [...b.statuses].sort().join(",");
  const aMethods = [...a.paymentMethods].sort().join(",");
  const bMethods = [...b.paymentMethods].sort().join(",");

  return a.order === b.order && a.client === b.client && aStatuses === bStatuses && aMethods === bMethods;
};

const toSearchParams = (filters: ReceivableFilters): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.order.trim()) {
    params.set("order", filters.order.trim());
  }

  if (filters.client.trim()) {
    params.set("client", filters.client.trim());
  }

  if (filters.statuses.length > 0 && filters.statuses.length < receivableStatusOptions.length) {
    params.set("statuses", filters.statuses.join(","));
  }

  if (filters.paymentMethods.length > 0 && filters.paymentMethods.length < paymentMethodOptions.length) {
    params.set("paymentMethods", filters.paymentMethods.join(","));
  }

  return params;
};

const fetchEntries = async (entryType: "receivable" | "payable", filters?: ReceivableFilters) => {
  const searchParams = new URLSearchParams();

  if (entryType === "receivable" && filters) {
    if (filters.order.trim()) {
      searchParams.set("order", filters.order.trim());
    }
    if (filters.client.trim()) {
      searchParams.set("client", filters.client.trim());
    }
    if (filters.statuses.length > 0 && filters.statuses.length < receivableStatusOptions.length) {
      searchParams.set("statuses", filters.statuses.join(","));
    }
    if (filters.paymentMethods.length > 0 && filters.paymentMethods.length < paymentMethodOptions.length) {
      searchParams.set("paymentMethods", filters.paymentMethods.join(","));
    }
  }

  const query = searchParams.toString();
  const response = await fetch(`/api/finance/${entryType}${query ? `?${query}` : ""}`);
  const payload = (await response.json()) as { data?: FinanceEntrySummary[]; error?: string };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "Falha ao carregar financeiro.");
  }

  return payload.data;
};

export function FinanceEntriesTable({ entryType }: FinanceEntriesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [draftFilters, setDraftFilters] = useState<ReceivableFilters>(() =>
    parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())),
  );
  const [appliedFilters, setAppliedFilters] = useState<ReceivableFilters>(() =>
    parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())),
  );

  const queryKey = entryType === "receivable" ? queryKeys.financeReceivable(appliedFilters) : queryKeys.financePayable();
  const { data = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchEntries(entryType, appliedFilters),
  });

  const hasActiveFilters =
    entryType === "receivable" &&
    (appliedFilters.order.trim().length > 0 ||
      appliedFilters.client.trim().length > 0 ||
      appliedFilters.statuses.length !== receivableStatusOptions.length ||
      appliedFilters.paymentMethods.length !== paymentMethodOptions.length);

  const hasPendingFilterChanges = entryType === "receivable" && !areFiltersEqual(draftFilters, appliedFilters);

  const selectedStatusLabel =
    draftFilters.statuses.length === receivableStatusOptions.length
      ? "Todos status"
      : `${draftFilters.statuses.length} status selecionado(s)`;

  const selectedPaymentLabel =
    draftFilters.paymentMethods.length === paymentMethodOptions.length
      ? "Todos pagamentos"
      : `${draftFilters.paymentMethods.length} pagamento(s)`;

  const settleMutation = useMutation({
    mutationFn: async (entry: FinanceEntrySummary) => {
      const remaining = Number(entry.amountTotal) - Number(entry.amountPaid);
      const response = await fetch(`/api/finance/receivable/${entry.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: remaining,
          method: entry.paymentMethod,
          notes: `Baixa total da parcela ${entry.installmentNumber}/${entry.installmentTotal}`,
        }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Falha ao realizar baixa financeira.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "receivable"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success("Baixa financeira registrada com sucesso.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar baixa financeira.");
    },
  });

  const emptyMessage = entryType === "receivable"
    ? "Ainda nao existem contas a receber. Elas sao criadas automaticamente quando um pedido e faturado."
    : "Ainda nao existem contas a pagar cadastradas.";

  const noFilterMatchMessage = "Nenhum lancamento encontrado para os filtros aplicados.";

  const applyFilters = () => {
    const normalizedFilters: ReceivableFilters = {
      order: draftFilters.order.trim(),
      client: draftFilters.client.trim(),
      statuses: draftFilters.statuses,
      paymentMethods: draftFilters.paymentMethods,
    };

    setDraftFilters(normalizedFilters);
    setAppliedFilters(normalizedFilters);

    const params = toSearchParams(normalizedFilters);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    queryClient.invalidateQueries({ queryKey: ["finance", "receivable"], refetchType: "active" });
  };

  const clearFilters = () => {
    const defaults: ReceivableFilters = {
      order: "",
      client: "",
      statuses: receivableStatusOptions.map((status) => status.value),
      paymentMethods: paymentMethodOptions.map((method) => method.value),
    };

    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    router.replace(pathname, { scroll: false });
    queryClient.invalidateQueries({ queryKey: ["finance", "receivable"], refetchType: "active" });
  };

  const toggleStatus = (status: FinanceEntryStatus, checked: boolean) => {
    setDraftFilters((current) => {
      if (checked) {
        return {
          ...current,
          statuses: current.statuses.includes(status) ? current.statuses : [...current.statuses, status],
        };
      }

      const next = current.statuses.filter((item) => item !== status);
      return {
        ...current,
        statuses: next.length > 0 ? next : current.statuses,
      };
    });
  };

  const togglePaymentMethod = (method: FinancePaymentMethod, checked: boolean) => {
    setDraftFilters((current) => {
      if (checked) {
        return {
          ...current,
          paymentMethods: current.paymentMethods.includes(method)
            ? current.paymentMethods
            : [...current.paymentMethods, method],
        };
      }

      const next = current.paymentMethods.filter((item) => item !== method);
      return {
        ...current,
        paymentMethods: next.length > 0 ? next : current.paymentMethods,
      };
    });
  };

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle>{entryType === "receivable" ? "Lancamentos a receber" : "Lancamentos a pagar"}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {entryType === "receivable" ? (
          <section className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-end">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Pedido</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftFilters.order}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, order: event.target.value }))}
                  placeholder="Numero do pedido"
                  className="pl-8"
                />
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Cliente</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftFilters.client}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, client: event.target.value }))}
                  placeholder="Nome do cliente"
                  className="pl-8"
                />
              </div>
            </label>

            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="outline" className="min-w-52 justify-between" />}>
                  <span className="truncate">{selectedStatusLabel}</span>
                  <SlidersHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Status visiveis</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {receivableStatusOptions.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={draftFilters.statuses.includes(option.value)}
                        onCheckedChange={(checked) => toggleStatus(option.value, checked === true)}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Forma de pagamento</span>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="outline" className="min-w-52 justify-between" />}>
                  <span className="truncate">{selectedPaymentLabel}</span>
                  <SlidersHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Pagamentos visiveis</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {paymentMethodOptions.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={draftFilters.paymentMethods.includes(option.value)}
                        onCheckedChange={(checked) => togglePaymentMethod(option.value, checked === true)}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              {hasPendingFilterChanges ? <Badge variant="secondary">Alteracoes nao aplicadas</Badge> : null}
              <Button type="button" variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters && !hasPendingFilterChanges}>
                <FilterX data-icon="inline-start" />
                Limpar filtros
              </Button>
              <Button type="button" variant={hasPendingFilterChanges ? "default" : "outline"} onClick={applyFilters} disabled={!hasPendingFilterChanges}>
                Aplicar filtros
              </Button>
            </div>

            <div className="md:col-span-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{data.length} resultado(s)</span>
              {hasActiveFilters ? <Badge variant="secondary">Filtros ativos</Badge> : null}
              {appliedFilters.order.trim() ? <Badge variant="outline">Pedido: {appliedFilters.order}</Badge> : null}
              {appliedFilters.client.trim() ? <Badge variant="outline">Cliente: {appliedFilters.client}</Badge> : null}
              {appliedFilters.statuses.length !== receivableStatusOptions.length ? (
                <Badge variant="outline">
                  Status: {appliedFilters.statuses.map((status) => statusLabelMap[status]).join(", ")}
                </Badge>
              ) : null}
              {appliedFilters.paymentMethods.length !== paymentMethodOptions.length ? (
                <Badge variant="outline">
                  Pagamento: {appliedFilters.paymentMethods.map((method) => paymentMethodLabelMap[method]).join(", ")}
                </Badge>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="overflow-x-auto">
          {error ? <InlineError message={error instanceof Error ? error.message : "Falha ao carregar financeiro."} className="mb-4" /> : null}

          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={`finance-skeleton-${index}`} className="h-11 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <InlineInfo message={hasActiveFilters ? noFilterMatchMessage : emptyMessage} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Parte</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {entryType === "receivable" ? <TableHead className="text-right">Acao</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{entry.description}</span>
                        {entry.orderNumber ? <span className="text-xs text-muted-foreground">Pedido: {entry.orderNumber}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell>{entry.counterpartyName || "-"}</TableCell>
                    <TableCell>
                      {entry.installmentNumber}/{entry.installmentTotal}
                    </TableCell>
                    <TableCell>{formatDate(entry.dueDate)}</TableCell>
                    <TableCell>
                      {paymentMethodLabelMap[entry.paymentMethod as FinancePaymentMethod] ?? entry.paymentMethod}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariantMap[entry.status]}>{statusLabelMap[entry.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amountPaid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amountTotal - entry.amountPaid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amountTotal)}</TableCell>
                    {entryType === "receivable" ? (
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            settleMutation.isPending ||
                            !(entry.status === "open" || entry.status === "partial" || entry.status === "overdue") ||
                            (entry.amountTotal - entry.amountPaid) <= 0
                          }
                          onClick={() => settleMutation.mutate(entry)}
                        >
                          {settleMutation.isPending ? "Baixando..." : "Dar baixa"}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
