import { z } from "zod";

import { MEASUREMENT_UNITS } from "@/domain/quote.types";

const numberField = z.number().min(0, "O valor nao pode ser negativo");

const partySchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  document: z.string().min(11, "Informe CNPJ/CPF"),
  stateRegistration: z.string(),
  phone: z.string().min(8, "Informe o telefone"),
  address: z.string().min(5, "Informe o endereco"),
  zipCode: z.string().min(8, "Informe o CEP"),
  city: z.string().min(2, "Informe a cidade"),
  state: z.string().min(2, "Informe o estado"),
  logoDataUrl: z.string().optional(),
});

const itemSchema = z.object({
  id: z.string().min(1),
  catalogItemId: z.string().uuid().optional(),
  code: z.string().min(1, "Codigo obrigatorio"),
  name: z.string().min(2, "Nome obrigatorio"),
  unitPrice: numberField,
  quantity: numberField.min(0.001, "Quantidade deve ser maior que zero"),
  unit: z.enum(MEASUREMENT_UNITS),
});

export const quoteFormSchema = z.object({
  quoteNumber: z.string().min(1),
  issueDate: z.string().min(1),
  company: partySchema,
  client: partySchema,
  items: z.array(itemSchema).min(1, "Adicione pelo menos um produto"),
  adjustments: z.object({
    discountType: z.enum(["fixed", "percent"]),
    discountValue: numberField,
    freight: numberField,
    taxRate: numberField,
  }),
  notes: z.string().max(1000, "Use no maximo 1000 caracteres"),
});

export type QuoteFormInput = z.infer<typeof quoteFormSchema>;
