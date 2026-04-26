"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuoteFormInput } from "@/domain/quote.schema";
import { formatSelectValue, selectLabelMaps } from "@/lib/select-labels";

type OnboardingDiscountTypeSelectProps = {
  id: string;
  name: string;
  defaultValue: QuoteFormInput["adjustments"]["discountType"];
};

export function OnboardingDiscountTypeSelect({ id, name, defaultValue }: OnboardingDiscountTypeSelectProps) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue>{formatSelectValue(selectLabelMaps.discountType, "Selecione o tipo")}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="fixed">Fixo</SelectItem>
          <SelectItem value="percent">Percentual</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
