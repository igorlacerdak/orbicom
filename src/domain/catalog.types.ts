import { MeasurementUnit } from "@/domain/quote.types";

export type CatalogItemType = "product" | "service";

export type CatalogItem = {
  id: string;
  code: string;
  name: string;
  type: CatalogItemType;
  unit: MeasurementUnit;
  defaultUnitPrice: number;
  allowCustomDescription: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
