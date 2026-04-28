"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus, Receipt, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

import { type OrderUpdateInput, orderUpdateSchema } from "@/domain/order.schema";
import type { Order } from "@/domain/order.types";
import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InlineError, InlineInfo } from "@/components/ui/inline-feedback";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";

type OrderEditorProps = {
  order: Order;
};

const toFormValues = (order: Order): OrderUpdateInput => ({
  issueDate: order.issueDate,
  notes: order.notes,
  paymentMethod:
    order.paymentMethod === "a_vista" ||
    order.paymentMethod === "boleto" ||
    order.paymentMethod === "pix" ||
    order.paymentMethod === "cartao_credito"
      ? order.paymentMethod
      : "boleto",
  receivableInstallmentsCount: order.receivableInstallmentsCount,
  receivableFirstDueDays: order.receivableFirstDueDays,
  receivableIntervalDays: order.receivableIntervalDays,
  items: order.items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  })),
});

const editableStatus = new Set<Order["status"]>(["awaiting_billing"]);

const statusLabel: Record<Order["status"], string> = {
  awaiting_billing: "Aguardando faturamento",
  billed: "Faturado",
  partially_paid: "Parcialmente pago",
  paid: "Pago",
  cancelled: "Cancelado",
};

const statusVariant: Record<Order["status"], "secondary" | "default" | "outline" | "success" | "destructive"> = {
  awaiting_billing: "secondary",
  billed: "default",
  partially_paid: "outline",
  paid: "success",
  cancelled: "destructive",
};

const paymentMethodLabelMap: Record<OrderUpdateInput["paymentMethod"], string> = {
  a_vista: "A vista",
  boleto: "Boleto",
  pix: "Pix",
  cartao_credito: "Cartao de Credito",
};

export function OrderEditor({ order }: OrderEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = editableStatus.has(order.status);

  const form = useForm<OrderUpdateInput>({
    resolver: zodResolver(orderUpdateSchema),
    defaultValues: toFormValues(order),
    mode: "onTouched",
  });

  const { control, register, handleSubmit, formState, setValue, reset, getValues, trigger } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const watchedPaymentMethod = useWatch({ control, name: "paymentMethod" });

  useEffect(() => {
    if (watchedPaymentMethod === "a_vista") {
      setValue("receivableInstallmentsCount", 1, { shouldValidate: true, shouldDirty: true });
      setValue("receivableFirstDueDays", 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedPaymentMethod, setValue]);

  const subtotal = watchedItems.reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  const saveMutation = useMutation({
    mutationFn: async (payload: OrderUpdateInput) => {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { data?: Order; error?: string };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Falha ao atualizar pedido.");
      }

      return body.data;
    },
    onSuccess: (updatedOrder) => {
      reset(toFormValues(updatedOrder));
      queryClient.setQueryData(queryKeys.orders(), (current: unknown) => {
        if (!Array.isArray(current)) return current;
        return current.map((item) => {
          const row = item as { id?: string };
          return row.id === updatedOrder.id ? updatedOrder : row;
        });
      });
      router.refresh();
      toast.success("Pedido atualizado com sucesso.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar pedido.");
    },
  });

  const billMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${order.id}/bill`, { method: "POST" });
      const body = (await response.json()) as { data?: Order; error?: string };

      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Falha ao faturar pedido.");
      }

      return body.data;
    },
    onSuccess: (billedOrder) => {
      queryClient.setQueryData(queryKeys.orders(), (current: unknown) => {
        if (!Array.isArray(current)) return current;
        return current.map((item) => {
          const row = item as { id?: string };
          return row.id === billedOrder.id ? billedOrder : row;
        });
      });
      queryClient.invalidateQueries({ queryKey: ["finance", "receivable"], refetchType: "active" });
      router.refresh();
      toast.success("Pedido faturado e financeiro gerado com sucesso.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao faturar pedido.");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${order.id}/reopen`, { method: "POST" });
      const body = (await response.json()) as { data?: Order; error?: string };

      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Falha ao reabrir pedido.");
      }

      return body.data;
    },
    onSuccess: (reopenedOrder) => {
      queryClient.setQueryData(queryKeys.orders(), (current: unknown) => {
        if (!Array.isArray(current)) return current;
        return current.map((item) => {
          const row = item as { id?: string };
          return row.id === reopenedOrder.id ? reopenedOrder : row;
        });
      });
      queryClient.invalidateQueries({ queryKey: ["finance", "receivable"], refetchType: "active" });
      router.refresh();
      toast.success("Pedido reaberto para aguardando faturamento.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao reabrir pedido.");
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${order.id}/reverse-finance`, { method: "POST" });
      const body = (await response.json()) as { data?: Order; error?: string };

      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Falha ao estornar financeiro do pedido.");
      }

      return body.data;
    },
    onSuccess: (reopenedOrder) => {
      queryClient.setQueryData(queryKeys.orders(), (current: unknown) => {
        if (!Array.isArray(current)) return current;
        return current.map((item) => {
          const row = item as { id?: string };
          return row.id === reopenedOrder.id ? reopenedOrder : row;
        });
      });
      queryClient.invalidateQueries({ queryKey: ["finance", "receivable"], refetchType: "active" });
      router.refresh();
      toast.success("Estorno total realizado e pedido reaberto.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Falha ao estornar financeiro do pedido.");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await saveMutation.mutateAsync(values);
  });

  const handleBillClick = async () => {
    if (billMutation.isPending || saveMutation.isPending) {
      return;
    }

    if (formState.isDirty) {
      const isValid = await trigger();

      if (!isValid) {
        toast.error("Revise os campos do pedido antes de faturar.");
        return;
      }

      await saveMutation.mutateAsync(getValues());
    }

    await billMutation.mutateAsync();
  };

  return (
    <div className="grid gap-6">
      <PageHero
        title={`Pedido ${order.orderNumber}`}
        description={`Cliente: ${order.client.name} - Emissao em ${formatDate(order.issueDate)}`}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>

            {order.status === "awaiting_billing" ? (
              <Button type="button" variant="secondary" disabled={billMutation.isPending || saveMutation.isPending} onClick={handleBillClick}>
                <Receipt data-icon="inline-start" />
                {billMutation.isPending ? "Faturando..." : saveMutation.isPending ? "Salvando..." : "Faturar"}
              </Button>
            ) : null}

            {order.status === "billed" ? (
              <Button type="button" variant="outline" disabled={reopenMutation.isPending} onClick={() => reopenMutation.mutate()}>
                <RotateCcw data-icon="inline-start" />
                {reopenMutation.isPending ? "Reabrindo..." : "Voltar para aberto"}
              </Button>
            ) : null}

            {(order.status === "partially_paid" || order.status === "paid") ? (
              <Button type="button" variant="destructive" disabled={reverseMutation.isPending} onClick={() => reverseMutation.mutate()}>
                <RotateCcw data-icon="inline-start" />
                {reverseMutation.isPending ? "Estornando..." : "Estornar financeiro total"}
              </Button>
            ) : null}

            {canEdit ? (
              <Button type="submit" form="order-editor-form" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            ) : null}
          </div>
        )}
      />

      {!canEdit ? (
        <InlineInfo message="Pedidos faturados, parcialmente pagos, pagos ou cancelados ficam bloqueados para edicao." />
      ) : null}

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Dados fixos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-3 text-sm">
            <p className="text-xs text-muted-foreground">Empresa</p>
            <p className="font-medium">{order.company.name}</p>
            <p className="text-muted-foreground">{order.company.document}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3 text-sm">
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="font-medium">{order.client.name}</p>
            <p className="text-muted-foreground">{order.client.document}</p>
          </div>
        </CardContent>
      </Card>

      <form id="order-editor-form" onSubmit={onSubmit} className="grid gap-6">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Faturamento e pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="issueDate">Data de emissao</FieldLabel>
                <FieldContent>
                  <Input id="issueDate" type="date" disabled={!canEdit} {...register("issueDate")} />
                  <FieldError>{formState.errors.issueDate?.message}</FieldError>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="paymentMethod">Forma de pagamento</FieldLabel>
                <FieldContent>
                  <Controller
                    control={control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                        <SelectTrigger id="paymentMethod" className="w-full">
                          <SelectValue>{paymentMethodLabelMap[field.value]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="a_vista">A vista</SelectItem>
                            <SelectItem value="boleto">Boleto</SelectItem>
                            <SelectItem value="pix">Pix</SelectItem>
                            <SelectItem value="cartao_credito">Cartao de Credito</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError>{formState.errors.paymentMethod?.message}</FieldError>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="receivableInstallmentsCount">Parcelas</FieldLabel>
                <FieldContent>
                  <Input
                    id="receivableInstallmentsCount"
                    type="number"
                    min={1}
                    max={24}
                    disabled={!canEdit || watchedPaymentMethod === "a_vista"}
                    {...register("receivableInstallmentsCount", { valueAsNumber: true })}
                  />
                  <FieldError>{formState.errors.receivableInstallmentsCount?.message}</FieldError>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="receivableFirstDueDays">1o vencimento (dias)</FieldLabel>
                <FieldContent>
                  <Input
                    id="receivableFirstDueDays"
                    type="number"
                    min={0}
                    max={365}
                    disabled={!canEdit || watchedPaymentMethod === "a_vista"}
                    {...register("receivableFirstDueDays", { valueAsNumber: true })}
                  />
                  <FieldError>{formState.errors.receivableFirstDueDays?.message}</FieldError>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="receivableIntervalDays">Intervalo entre parcelas</FieldLabel>
                <FieldContent>
                  <Input
                    id="receivableIntervalDays"
                    type="number"
                    min={1}
                    max={365}
                    disabled={!canEdit || watchedPaymentMethod === "a_vista"}
                    {...register("receivableIntervalDays", { valueAsNumber: true })}
                  />
                  <FieldError>{formState.errors.receivableIntervalDays?.message}</FieldError>
                </FieldContent>
              </Field>
            </FieldGroup>
            {watchedPaymentMethod === "a_vista" ? (
              <p className="mt-3 text-xs text-muted-foreground">Pagamento a vista aplica baixa imediata no faturamento.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Itens do pedido</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canEdit}
                onClick={() =>
                  append({
                    code: "",
                    name: "",
                    quantity: 1,
                    unit: "UN",
                    unitPrice: 0,
                  })
                }
              >
                <Plus data-icon="inline-start" />
                Adicionar item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead>Valor unitario</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Acao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const row = watchedItems[index];
                  const lineTotal = Number(row?.quantity ?? 0) * Number(row?.unitPrice ?? 0);

                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input disabled={!canEdit} {...register(`items.${index}.code`)} />
                      </TableCell>
                      <TableCell>
                        <Input disabled={!canEdit} {...register(`items.${index}.name`)} />
                      </TableCell>
                      <TableCell>
                        <Input disabled={!canEdit} {...register(`items.${index}.unit`)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          disabled={!canEdit}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          disabled={!canEdit}
                          {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(lineTotal)}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="sm" disabled={!canEdit} onClick={() => remove(index)}>
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {formState.errors.items?.message ? <InlineError message={formState.errors.items.message} className="mt-3" compact /> : null}
            <p className="mt-3 text-sm text-muted-foreground">Subtotal atual: {formatCurrency(subtotal)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="orderNotes">Notas internas/comerciais</FieldLabel>
              <FieldContent>
                <Textarea id="orderNotes" rows={8} disabled={!canEdit} {...register("notes")} />
              </FieldContent>
            </Field>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Total atual estimado (itens): <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
        </p>
      </form>
    </div>
  );
}
