'use client';

import { Control, Controller, UseFormRegister } from 'react-hook-form';

import { QuoteFormInput } from '@/domain/quote.schema';
import { QuoteTotals } from '@/domain/quote.types';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const DISCOUNT_TYPE_LABEL: Record<QuoteFormInput["adjustments"]["discountType"], string> = {
  fixed: "Valor fixo (R$)",
  percent: "Percentual (%)",
};

export const TotalsCard = ({ control, register, totals }: TotalsCardProps) => {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Totais e ajustes</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de desconto</Label>
          <Controller
            control={control}
            name="adjustments.discountType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione">
                    {DISCOUNT_TYPE_LABEL[field.value]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discountValue">Desconto</Label>
          <Input
            id="discountValue"
            type="number"
            min="0"
            step="0.01"
            {...register('adjustments.discountValue', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="freight">Frete</Label>
          <Input
            id="freight"
            type="number"
            min="0"
            step="0.01"
            {...register('adjustments.freight', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxRate">Impostos (%)</Label>
          <Input
            id="taxRate"
            type="number"
            min="0"
            step="0.01"
            {...register('adjustments.taxRate', { valueAsNumber: true })}
          />
        </div>

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
