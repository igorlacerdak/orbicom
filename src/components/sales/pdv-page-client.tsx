"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Minus, Plus, Receipt, Trash2, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { InputSearch } from "@/components/ui/input-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-feedback";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogItem } from "@/domain/catalog.types";
import type { PdvSaleInput } from "@/domain/pdv.schema";
import type { Order, OrderPaymentMethod } from "@/domain/order.types";
import type { DiscountType } from "@/domain/quote.types";
import { formatCurrency } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import type { ClientSummary } from "@/server/client-service";

type CartItem = {
  id: string;
  catalogItemId?: string;
  code: string;
  name: string;
  unit: "UN" | "KG" | "TON";
  quantity: number;
  unitPrice: number;
};

const fetchClients = async (search: string): Promise<ClientSummary[]> => {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  const response = await fetch(`/api/clients?${params.toString()}`);
  const body = (await response.json()) as { data?: ClientSummary[]; error?: string };

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Falha ao buscar clientes.");
  }

  return body.data;
};

const fetchCatalogItems = async (search: string): Promise<CatalogItem[]> => {
  const params = new URLSearchParams();
  params.set("active", "true");
  if (search.trim()) params.set("q", search.trim());

  const response = await fetch(`/api/catalog/items?${params.toString()}`);
  const body = (await response.json()) as { data?: CatalogItem[]; error?: string };

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Falha ao buscar produtos.");
  }

  return body.data;
};

const paymentLabels: Record<OrderPaymentMethod, string> = {
  a_vista: "A vista",
  boleto: "Boleto",
  pix: "Pix",
  cartao_credito: "Cartao de credito",
};

export function PdvPageClient() {
  const queryClient = useQueryClient();
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("pix");
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedClientSearch(clientSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        document.getElementById("pdv-product-search")?.focus();
      }

      if (event.key === "F4") {
        event.preventDefault();
        document.getElementById("pdv-client-search")?.focus();
      }

      if (event.key === "F9") {
        event.preventDefault();
        document.getElementById("pdv-finish-sale")?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const {
    data: clients = [],
    isLoading: isLoadingClients,
    isFetching: isFetchingClients,
    error: clientsError,
    refetch: refetchClients,
  } = useQuery({
    queryKey: queryKeys.clients(debouncedClientSearch),
    queryFn: () => fetchClients(debouncedClientSearch),
    placeholderData: (previous) => previous,
  });

  const {
    data: products = [],
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: queryKeys.catalogItems({ q: debouncedProductSearch, type: "all", showInactive: false }),
    queryFn: () => fetchCatalogItems(debouncedProductSearch),
    placeholderData: (previous) => previous,
  });

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
    [items],
  );
  const discountAmount = useMemo(() => {
    const rawDiscount =
      discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;

    return Math.min(subtotal, Math.max(0, Number.isFinite(rawDiscount) ? rawDiscount : 0));
  }, [discountType, discountValue, subtotal]);
  const total = Math.max(0, subtotal - discountAmount);

  const addProduct = (product: CatalogItem) => {
    setItems((current) => {
      const existing = current.find((item) => item.catalogItemId === product.id);
      if (existing) {
        return current.map((item) =>
          item.catalogItemId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          catalogItemId: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.defaultUnitPrice,
        },
      ];
    });
    setProductSearch("");
    setDebouncedProductSearch("");
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0.01, quantity) } : item,
      ),
    );
  };

  const saleMutation = useMutation({
    mutationFn: async (payload: PdvSaleInput) => {
      const response = await fetch("/api/sales/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { data?: Order; error?: string };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Falha ao registrar venda.");
      }

      return body.data;
    },
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders(), (current: unknown) => {
        if (!Array.isArray(current)) return [order];
        return [order, ...current];
      });
      toast.success(`Venda ${order.orderNumber} concluida com sucesso.`);
      setSelectedClient(null);
      setClientSearch("");
      setDebouncedClientSearch("");
      setProductSearch("");
      setDebouncedProductSearch("");
      setItems([]);
      setPaymentMethod("pix");
      setDiscountType("fixed");
      setDiscountValue(0);
      setNotes("");
      document.getElementById("pdv-product-search")?.focus();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar venda.");
    },
  });

  const handleFinishSale = () => {
    if (!selectedClient) {
      toast.error("Selecione um cliente para registrar a venda.");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione ao menos um produto.");
      return;
    }

    saleMutation.mutate({
      clientId: selectedClient.id,
      paymentMethod,
      discountType,
      discountValue,
      notes,
      items: items.map((item) => ({
        catalogItemId: item.catalogItemId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  };

  const clientErrorMessage = clientsError instanceof Error ? clientsError.message : "";
  const productErrorMessage = productsError instanceof Error ? productsError.message : "";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-10 pt-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">PDV</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Frente de caixa para registrar vendas com cliente, produtos e pagamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">F2 Produto</Badge>
          <Badge variant="outline">F4 Cliente</Badge>
          <Badge variant="outline">F9 Finalizar</Badge>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <InputSearch
                inputId="pdv-client-search"
                value={clientSearch}
                onValueChange={setClientSearch}
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
                onSelect={(client) => {
                  setSelectedClient(client);
                  setClientSearch(client.name);
                  setDebouncedClientSearch(client.name);
                }}
                loading={isLoadingClients || isFetchingClients}
                placeholder="Buscar cliente por nome, CPF ou CNPJ"
                emptyMessage="Nenhum cliente encontrado."
                searchLabel="Buscar cliente"
                onSearch={() => {
                  setDebouncedClientSearch(clientSearch.trim());
                  void refetchClients();
                }}
              />
              {clientErrorMessage ? <InlineError message={clientErrorMessage} compact /> : null}
              {selectedClient ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <UserRound />
                      <span className="truncate">{selectedClient.name}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{selectedClient.document}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedClient(null)}>
                    Remover
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Produtos e servicos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InputSearch
                inputId="pdv-product-search"
                value={productSearch}
                onValueChange={setProductSearch}
                results={products}
                getItemKey={(product) => product.id}
                renderItem={(product) => (
                  <>
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.code} - {product.unit} - {formatCurrency(product.defaultUnitPrice)}
                    </span>
                  </>
                )}
                onSelect={addProduct}
                loading={isLoadingProducts || isFetchingProducts}
                placeholder="Buscar produto por codigo ou descricao"
                emptyMessage="Nenhum produto encontrado."
                searchLabel="Buscar produto"
                onSearch={() => {
                  setDebouncedProductSearch(productSearch.trim());
                  void refetchProducts();
                }}
              />
              {productErrorMessage ? <InlineError message={productErrorMessage} compact /> : null}

              <div className="overflow-hidden rounded-lg border border-border/70">
                {items.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum item no carrinho. Busque um produto para adicionar.
                  </p>
                ) : (
                  <div className="divide-y divide-border/70">
                    {items.map((item) => (
                      <div key={item.id} className="grid gap-3 p-3 md:grid-cols-[1fr_140px_120px_40px] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.code} - {item.unit} - {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon-sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Minus />
                          </Button>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                          />
                          <Button type="button" size="icon-sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus />
                          </Button>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remover ${item.name}`}
                          onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt />
                Fechamento
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-lg border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Total da venda</p>
                <p className="mt-1 text-3xl font-semibold">{formatCurrency(total)}</p>
                {discountAmount > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Subtotal {formatCurrency(subtotal)} - desconto {formatCurrency(discountAmount)}
                  </p>
                ) : null}
              </div>

              <FieldGroup>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                  <Field>
                    <FieldLabel>Tipo de desconto</FieldLabel>
                    <FieldContent>
                      <Select value={discountType} onValueChange={(value) => setDiscountType(value as DiscountType)}>
                        <SelectTrigger className="w-full">
                          <SelectValue>{discountType === "fixed" ? "Valor" : "Porcentagem"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="fixed">Valor</SelectItem>
                            <SelectItem value="percent">Porcentagem</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="pdv-discount">Desconto</FieldLabel>
                    <FieldContent>
                      <Input
                        id="pdv-discount"
                        type="number"
                        min="0"
                        max={discountType === "percent" ? 100 : undefined}
                        step="0.01"
                        value={discountValue}
                        onChange={(event) => setDiscountValue(Number(event.target.value))}
                      />
                    </FieldContent>
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Forma de pagamento</FieldLabel>
                  <FieldContent>
                    <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as OrderPaymentMethod)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>{paymentLabels[paymentMethod]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="a_vista">A vista</SelectItem>
                          <SelectItem value="cartao_credito">Cartao de credito</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="pdv-notes">Observacoes</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="pdv-notes"
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Observacoes da venda"
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              <Button
                id="pdv-finish-sale"
                type="button"
                size="lg"
                disabled={saleMutation.isPending}
                onClick={handleFinishSale}
              >
                <CreditCard data-icon="inline-start" />
                {saleMutation.isPending ? "Registrando..." : "Finalizar venda"}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
