"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldErrors, UseFieldArrayAppend, UseFieldArrayRemove, UseFormRegister } from "react-hook-form";

import { MEASUREMENT_UNITS } from "@/domain/quote.types";
import { QuoteFormInput } from "@/domain/quote.schema";
import { defaultItem } from "@/domain/quote.defaults";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ItemsTableProps = {
  itemCount: number;
  register: UseFormRegister<QuoteFormInput>;
  errors: FieldErrors<QuoteFormInput>;
  remove: UseFieldArrayRemove;
  append: UseFieldArrayAppend<QuoteFormInput, "items">;
};

export const ItemsTable = ({ itemCount, register, errors, remove, append }: ItemsTableProps) => {
  const rows = Array.from({ length: itemCount });

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">Produtos e servicos</CardTitle>
        <Button type="button" variant="outline" onClick={() => append(defaultItem())}>
          <Plus />
          Adicionar item
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-28">Codigo</TableHead>
              <TableHead className="min-w-60">Produto</TableHead>
              <TableHead className="min-w-28">Preco unit.</TableHead>
              <TableHead className="min-w-24">Qtd.</TableHead>
              <TableHead className="min-w-24">Unidade</TableHead>
              <TableHead className="min-w-16 text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input {...register(`items.${index}.code`)} placeholder="COD-0001" />
                  <p className="mt-1 text-xs text-destructive">{errors.items?.[index]?.code?.message}</p>
                </TableCell>
                <TableCell>
                  <Input {...register(`items.${index}.name`)} placeholder="Nome do produto" />
                  <p className="mt-1 text-xs text-destructive">{errors.items?.[index]?.name?.message}</p>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </TableCell>
                <TableCell>
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    {...register(`items.${index}.unit`)}
                  >
                    {MEASUREMENT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="text-right">
                  <Input type="hidden" {...register(`items.${index}.id`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={itemCount <= 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="text-xs text-destructive">{errors.items?.message}</p>
      </CardContent>
    </Card>
  );
};
