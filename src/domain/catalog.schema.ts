import { z } from "zod";

import { MEASUREMENT_UNITS } from "@/domain/quote.types";

export const catalogItemSchema = z.object({
  code: z.string().min(1, "Informe o codigo"),
  name: z.string().min(2, "Informe a descricao"),
  type: z.enum(["product", "service"]),
  unit: z.enum(MEASUREMENT_UNITS),
  defaultUnitPrice: z.number().min(0, "O preco nao pode ser negativo"),
  allowCustomDescription: z.boolean(),
  active: z.boolean(),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
