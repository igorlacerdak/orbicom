import type { ClientInput } from "@/domain/client.schema";
import type { ClientSummary } from "@/server/client-service";

export const defaultClientValues: ClientInput = {
  name: "",
  document: "",
  stateRegistration: "",
  phone: "",
  address: {
    street: "",
    number: "",
    complement: "",
    district: "",
    zipCode: "",
    city: "",
    state: "",
    country: "Brasil",
  },
};

export const getClientFormValues = (client?: ClientSummary | null): ClientInput => {
  if (!client) {
    return defaultClientValues;
  }

  return {
    name: client.name,
    document: client.document,
    stateRegistration: client.stateRegistration,
    phone: client.phone,
    address: client.address,
  };
};
