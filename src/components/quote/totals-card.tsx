'use client';

import { Control, Controller, UseFormRegister } from 'react-hook-form';

import { QuoteFormInput } from '@/domain/quote.schema';
import { QuoteTotals } from '@/domain/quote.types';
import { formatCurrency } from '@/lib/formatters';
import { formatSelectValue, selectLabelMaps } from '@/lib/select-labels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TotalsCardProps = {
  control: Control<QuoteFormInput>;
  register: UseFormRegister<QuoteFormInput>;
  totals: QuoteTotals;
};

export const TotalsCard = ({ control, register, totals }: TotalsCardProps) => {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Totais e ajustes</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FieldGroup className="grid grid-cols-1 gap-4 lg:col-span-2 lg:grid-cols-2">
          <Field>
            <FieldLabel>Tipo de desconto</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="adjustments.discountType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {formatSelectValue(selectLabelMaps.discountType, 'Selecione')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="discountValue">Desconto</FieldLabel>
            <FieldContent>
              <Input
                id="discountValue"
                type="number"
                min="0"
                step="0.01"
                {...register('adjustments.discountValue', { valueAsNumber: true })}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="freight">Frete</FieldLabel>
            <FieldContent>
              <Input
                id="freight"
                type="number"
                min="0"
                step="0.01"
                {...register('adjustments.freight', { valueAsNumber: true })}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="taxRate">Impostos (%)</FieldLabel>
            <FieldContent>
              <Input
                id="taxRate"
                type="number"
                min="0"
                step="0.01"
                {...register('adjustments.taxRate', { valueAsNumber: true })}
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        <div className="rounded-lg border border-border bg-muted/20 p-4 lg:col-span-2">
          <div className="space-y-1 text-sm">
            <p className="flex justify-between">
              <span>Subtotal</span>
              <strong>{formatCurrency(totals.subtotal)}</strong>
            </p>
            <p className="flex justify-between">
              <span>Desconto</span>
              <strong>- {formatCurrency(totals.discountAmount)}</strong>
            </p>
            <p className="flex justify-between">
              <span>Frete</span>
              <strong>{formatCurrency(totals.freight)}</strong>
            </p>
            <p className="flex justify-between">
              <span>Impostos</span>
              <strong>{formatCurrency(totals.taxAmount)}</strong>
            </p>
            <p className="mt-2 flex justify-between text-base text-primary">
              <span>Total final</span>
              <strong>{formatCurrency(totals.total)}</strong>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
