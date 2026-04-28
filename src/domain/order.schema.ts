import { z } from "zod";

import { MEASUREMENT_UNITS } from "@/domain/quote.types";

export const orderItemInputSchema = z.object({
  id: z.uuid().optional(),
  code: z.string().min(1, "Informe o codigo do item"),
  name: z.string().min(2, "Informe a descricao do item"),
  unit: z.enum(MEASUREMENT_UNITS),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unitPrice: z.number().min(0, "Valor unitario nao pode ser negativo"),
});

export const orderPaymentMethodSchema = z.enum(["a_vista", "boleto", "pix", "cartao_credito"]);

export const orderUpdateSchema = z.object({
  issueDate: z.string().min(1),
  notes: z.string(),
  paymentMethod: orderPaymentMethodSchema,
  receivableInstallmentsCount: z.number().int().min(1).max(24),
  receivableFirstDueDays: z.number().int().min(0).max(365),
  receivableIntervalDays: z.number().int().min(1).max(365),
  items: z.array(orderItemInputSchema).min(1, "Inclua ao menos um item"),
});

export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
