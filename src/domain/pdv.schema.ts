import { z } from "zod";

import { MEASUREMENT_UNITS } from "@/domain/quote.types";
import { orderPaymentMethodSchema } from "@/domain/order.schema";

export const pdvSaleItemSchema = z.object({
  catalogItemId: z.uuid().optional(),
  code: z.string().min(1, "Informe o codigo"),
  name: z.string().min(2, "Informe o produto"),
  unit: z.enum(MEASUREMENT_UNITS),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unitPrice: z.number().min(0, "Preco unitario nao pode ser negativo"),
});

export const pdvSaleSchema = z.object({
  clientId: z.uuid("Selecione um cliente"),
  paymentMethod: orderPaymentMethodSchema,
  discountType: z.enum(["fixed", "percent"]).default("fixed"),
  discountValue: z.number().min(0, "Desconto nao pode ser negativo").default(0),
  notes: z.string().max(500, "Use no maximo 500 caracteres").default(""),
  items: z.array(pdvSaleItemSchema).min(1, "Adicione ao menos um item"),
});

export type PdvSaleInput = z.infer<typeof pdvSaleSchema>;
