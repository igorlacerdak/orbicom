import { CatalogItemType } from "@/domain/catalog.types";
import { QuoteFormInput } from "@/domain/quote.schema";
import { MeasurementUnit } from "@/domain/quote.types";

const isEmpty = (value: unknown) => value === null || value === undefined || value === "";

export const selectLabelMaps = {
  discountType: {
    fixed: "Fixo",
    percent: "Percentual",
  } satisfies Record<QuoteFormInput["adjustments"]["discountType"], string>,
  catalogType: {
    all: "Todos",
    product: "Produto",
    service: "Servico",
  } satisfies Record<CatalogItemType | "all", string>,
  measurementUnit: {
    UN: "UN",
    KG: "KG",
    TON: "TON",
  } satisfies Record<MeasurementUnit, string>,
};

export const formatSelectValue = <T extends string>(
  labels: Record<T, string>,
  placeholder: string,
) => {
  return (value: unknown) => {
    if (isEmpty(value)) {
      return placeholder;
    }

    const key = String(value) as T;
    return labels[key] ?? key;
  };
};
