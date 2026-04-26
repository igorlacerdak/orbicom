"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-feedback";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalogItemSchema, type CatalogItemInput } from "@/domain/catalog.schema";
import type { CatalogItem, CatalogItemType } from "@/domain/catalog.types";
import { MEASUREMENT_UNITS } from "@/domain/quote.types";
import { formatSelectValue, selectLabelMaps } from "@/lib/select-labels";

type UpsertCatalogItemDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialItem: CatalogItem | null;
  loading: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CatalogItemInput) => Promise<void>;
};

const emptyValues: CatalogItemInput = {
  code: "",
  name: "",
  type: "product",
  unit: "UN",
  defaultUnitPrice: 0,
  allowCustomDescription: false,
  active: true,
};

const toFormValues = (item: CatalogItem | null): CatalogItemInput => {
  if (!item) {
    return emptyValues;
  }

  return {
    code: item.code,
    name: item.name,
    type: item.type,
    unit: item.unit,
    defaultUnitPrice: item.defaultUnitPrice,
    allowCustomDescription: item.allowCustomDescription,
    active: item.active,
  };
};

export function UpsertCatalogItemDialog({
  open,
  mode,
  initialItem,
  loading,
  error,
  onOpenChange,
  onSubmit,
}: UpsertCatalogItemDialogProps) {
  const form = useForm<CatalogItemInput>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: toFormValues(initialItem),
    mode: "onTouched",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(toFormValues(initialItem));
  }, [form, initialItem, open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
    form.reset(emptyValues);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualize descricao, tipo, unidade e regras comerciais do item."
              : "Cadastre um produto ou servico para uso rapido nos orcamentos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="catalog-code">Codigo</FieldLabel>
              <FieldContent>
                <Input id="catalog-code" {...form.register("code")} disabled={mode === "edit"} />
                <FieldError>{form.formState.errors.code?.message}</FieldError>
                {mode === "edit" ? (
                  <p className="text-xs text-muted-foreground">Codigo bloqueado apos criacao.</p>
                ) : null}
              </FieldContent>
            </Field>

            <Field className="md:col-span-1">
              <FieldLabel htmlFor="catalog-name">Descricao</FieldLabel>
              <FieldContent>
                <Input id="catalog-name" {...form.register("name")} />
                <FieldError>{form.formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value as CatalogItemType)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>{formatSelectValue(selectLabelMaps.catalogType, "Tipo")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="product">Produto</SelectItem>
                          <SelectItem value="service">Servico</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{form.formState.errors.type?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Unidade</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue>{formatSelectValue(selectLabelMaps.measurementUnit, "Unidade")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {MEASUREMENT_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{form.formState.errors.unit?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="catalog-price">Preco padrao</FieldLabel>
              <FieldContent>
                <Input
                  id="catalog-price"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("defaultUnitPrice", { valueAsNumber: true })}
                />
                <FieldError>{form.formState.errors.defaultUnitPrice?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="catalog-allow-description">Descricao livre</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="allowCustomDescription"
                  render={({ field }) => (
                    <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
                      <Checkbox id="catalog-allow-description" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                      <label htmlFor="catalog-allow-description" className="text-sm text-muted-foreground">
                        Permite descricao customizada no orcamento
                      </label>
                    </div>
                  )}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="catalog-active">Status</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
                      <Checkbox id="catalog-active" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                      <label htmlFor="catalog-active" className="text-sm text-muted-foreground">
                        Item ativo para uso
                      </label>
                    </div>
                  )}
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          {error ? <InlineError message={error} compact /> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || form.formState.isSubmitting}>
              {loading ? "Salvando..." : mode === "edit" ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
