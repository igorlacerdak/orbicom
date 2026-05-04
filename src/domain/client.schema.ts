import { z } from "zod";

const clientAddressSchema = z.object({
  street: z.string().min(5, "Informe a rua/endereco"),
  number: z.string().min(1, "Informe o numero"),
  complement: z.string(),
  district: z.string().min(2, "Informe o bairro"),
  zipCode: z.string().min(8, "Informe o CEP"),
  city: z.string().min(2, "Informe a cidade"),
  state: z.string().min(2, "Informe o estado"),
  country: z.string().min(2, "Informe o pais"),
});

export const clientSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente"),
  document: z.string().min(11, "Informe CPF/CNPJ"),
  stateRegistration: z.string(),
  phone: z.string().min(8, "Informe o telefone"),
  address: clientAddressSchema,
});

export type ClientInput = z.infer<typeof clientSchema>;
