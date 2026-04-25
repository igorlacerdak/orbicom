import { z } from "zod";

export const settingsSchema = z.object({
  companyName: z.string().min(2, "Informe o nome da empresa"),
  companyDocument: z.string().min(11, "Informe CNPJ/CPF"),
  companyStateRegistration: z.string(),
  companyPhone: z.string().min(8, "Informe o telefone"),
  companyAddress: z.string().min(5, "Informe o endereco"),
  companyZipCode: z.string().min(8, "Informe o CEP"),
  companyCity: z.string().min(2, "Informe a cidade"),
  companyState: z.string().min(2, "Informe o estado"),
  companyLogoUrl: z.string().optional().default(""),
  defaultDiscountType: z.enum(["fixed", "percent"]),
  defaultDiscountValue: z.number().min(0),
  defaultFreight: z.number().min(0),
  defaultTaxRate: z.number().min(0),
  defaultValidityDays: z.number().int().min(1).max(365),
  defaultNotes: z.string().max(1000),
  quotePrefix: z.string().min(2).max(10),
  quoteSequence: z.number().int().min(1),
  orderPrefix: z.string().min(2).max(10),
  orderSequence: z.number().int().min(1),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
