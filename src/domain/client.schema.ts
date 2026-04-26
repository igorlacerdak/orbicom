import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente"),
  document: z.string().min(11, "Informe CPF/CNPJ"),
  stateRegistration: z.string(),
  phone: z.string().min(8, "Informe o telefone"),
  address: z.string().min(5, "Informe o endereco"),
  zipCode: z.string().min(8, "Informe o CEP"),
  city: z.string().min(2, "Informe a cidade"),
  state: z.string().min(2, "Informe o estado"),
});

export type ClientInput = z.infer<typeof clientSchema>;
