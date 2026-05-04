import { ClientInput } from "@/domain/client.schema";
import { ForbiddenError } from "@/server/errors";
import { hasAnyRole } from "@/server/workspace-context";
import { createClient } from "@/utils/supabase/server";
import { getWorkspaceContext } from "@/server/workspace-context";

type ClientSummary = {
  id: string;
  name: string;
  document: string;
  stateRegistration: string;
  phone: string;
  city: string;
  state: string;
  address: ClientInput["address"];
  updatedAt: string;
};

type ClientAddressRow = {
  id: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_primary: boolean;
};

const normalize = (value: string) => value.trim();

const clientColumns =
  "id,name,document,state_registration,phone,address,zip_code,city,state,updated_at,client_addresses(id,street,number,complement,district,city,state,zip_code,country,is_primary)";

const mapClient = (row: {
  id: string;
  name: string;
  document: string;
  state_registration: string;
  phone: string;
  address: string;
  zip_code: string;
  city: string;
  state: string;
  updated_at: string;
  client_addresses?: ClientAddressRow[] | null;
}): ClientSummary => {
  const primaryAddress = Array.isArray(row.client_addresses)
    ? row.client_addresses.find((address) => address.is_primary) ?? row.client_addresses[0]
    : undefined;

  return {
    id: row.id,
    name: row.name,
    document: row.document,
    stateRegistration: row.state_registration,
    phone: row.phone,
    city: primaryAddress?.city ?? row.city,
    state: primaryAddress?.state ?? row.state,
    address: {
      street: primaryAddress?.street ?? row.address,
      number: primaryAddress?.number ?? "",
      complement: primaryAddress?.complement ?? "",
      district: primaryAddress?.district ?? "",
      zipCode: primaryAddress?.zip_code ?? row.zip_code,
      city: primaryAddress?.city ?? row.city,
      state: primaryAddress?.state ?? row.state,
      country: primaryAddress?.country ?? "Brasil",
    },
    updatedAt: row.updated_at,
  };
};

export const clientService = {
  async list(search?: string): Promise<ClientSummary[]> {
    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    const query = normalize(search ?? "");

    let builder = supabase
      .from("clients")
      .select(clientColumns)
      .eq("workspace_id", workspace.workspaceId)
      .order("name", { ascending: true })
      .limit(200);

    if (query) {
      builder = builder.or(`name.ilike.%${query}%,document.ilike.%${query}%,city.ilike.%${query}%`);
    }

    const { data, error } = await builder;

    if (error) {
      throw new Error(`Falha ao listar clientes: ${error.message}`);
    }

    return (data ?? []).map((row) => mapClient(row as Parameters<typeof mapClient>[0]));
  },

  async create(input: ClientInput): Promise<ClientSummary> {
    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    if (!hasAnyRole(workspace.roles, ["owner", "admin", "operator"])) {
      throw new ForbiddenError("Apenas Dono/Administrador/Operador podem cadastrar clientes.");
    }

    const payload = {
      owner_id: workspace.userId,
      workspace_id: workspace.workspaceId,
      name: input.name.trim(),
      document: input.document.trim(),
      state_registration: input.stateRegistration?.trim() ?? "",
      phone: input.phone.trim(),
      address: input.address.street.trim(),
      zip_code: input.address.zipCode.trim(),
      city: input.address.city.trim(),
      state: input.address.state.trim(),
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("id,name,document,state_registration,phone,city,state,updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ja existe cliente com esse CPF/CNPJ neste workspace.");
      }

      throw new Error(`Falha ao cadastrar cliente: ${error.message}`);
    }

    const { error: addressError } = await supabase.from("client_addresses").insert({
      owner_id: workspace.userId,
      workspace_id: workspace.workspaceId,
      client_id: data.id,
      label: "principal",
      street: input.address.street.trim(),
      number: input.address.number.trim(),
      complement: input.address.complement.trim(),
      district: input.address.district.trim(),
      city: input.address.city.trim(),
      state: input.address.state.trim(),
      zip_code: input.address.zipCode.trim(),
      country: input.address.country.trim(),
      is_primary: true,
    });

    if (addressError) {
      throw new Error(`Cliente criado, mas falhou ao salvar endereco: ${addressError.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      document: data.document,
      stateRegistration: data.state_registration,
      phone: data.phone,
      city: data.city,
      state: data.state,
      address: {
        street: input.address.street.trim(),
        number: input.address.number.trim(),
        complement: input.address.complement.trim(),
        district: input.address.district.trim(),
        zipCode: input.address.zipCode.trim(),
        city: input.address.city.trim(),
        state: input.address.state.trim(),
        country: input.address.country.trim(),
      },
      updatedAt: data.updated_at,
    };
  },

  async update(id: string, input: ClientInput): Promise<ClientSummary> {
    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    if (!hasAnyRole(workspace.roles, ["owner", "admin", "operator"])) {
      throw new ForbiddenError("Apenas Dono/Administrador/Operador podem editar clientes.");
    }

    const { data, error } = await supabase
      .from("clients")
      .update({
        name: input.name.trim(),
        document: input.document.trim(),
        state_registration: input.stateRegistration?.trim() ?? "",
        phone: input.phone.trim(),
        address: input.address.street.trim(),
        zip_code: input.address.zipCode.trim(),
        city: input.address.city.trim(),
        state: input.address.state.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspace.workspaceId)
      .select(clientColumns)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ja existe cliente com esse CPF/CNPJ neste workspace.");
      }

      throw new Error(`Falha ao atualizar cliente: ${error.message}`);
    }

    const addressPayload = {
      owner_id: workspace.userId,
      workspace_id: workspace.workspaceId,
      client_id: id,
      label: "principal",
      street: input.address.street.trim(),
      number: input.address.number.trim(),
      complement: input.address.complement.trim(),
      district: input.address.district.trim(),
      city: input.address.city.trim(),
      state: input.address.state.trim(),
      zip_code: input.address.zipCode.trim(),
      country: input.address.country.trim(),
      is_primary: true,
      updated_at: new Date().toISOString(),
    };

    const existingPrimaryAddress = Array.isArray(data.client_addresses)
      ? (data.client_addresses as ClientAddressRow[]).find((address) => address.is_primary)
      : undefined;

    const addressResult = existingPrimaryAddress
      ? await supabase
          .from("client_addresses")
          .update(addressPayload)
          .eq("id", existingPrimaryAddress.id)
          .eq("workspace_id", workspace.workspaceId)
      : await supabase.from("client_addresses").insert(addressPayload);

    if (addressResult.error) {
      throw new Error(`Cliente atualizado, mas falhou ao salvar endereco: ${addressResult.error.message}`);
    }

    return mapClient({
      ...(data as Parameters<typeof mapClient>[0]),
      client_addresses: [
        {
          id: existingPrimaryAddress?.id ?? "",
          street: addressPayload.street,
          number: addressPayload.number,
          complement: addressPayload.complement,
          district: addressPayload.district,
          city: addressPayload.city,
          state: addressPayload.state,
          zip_code: addressPayload.zip_code,
          country: addressPayload.country,
          is_primary: true,
        },
      ],
    });
  },

  async remove(id: string): Promise<{ id: string }> {
    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    if (!hasAnyRole(workspace.roles, ["owner", "admin", "operator"])) {
      throw new ForbiddenError("Apenas Dono/Administrador/Operador podem excluir clientes.");
    }

    const [{ count: quotesCount, error: quotesError }, { count: ordersCount, error: ordersError }] = await Promise.all([
      supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.workspaceId)
        .eq("client_id", id),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.workspaceId)
        .eq("client_id", id),
    ]);

    if (quotesError || ordersError) {
      throw new Error("Falha ao verificar vinculos do cliente antes da exclusao.");
    }

    if ((quotesCount ?? 0) > 0 || (ordersCount ?? 0) > 0) {
      throw new Error("Nao e possivel excluir cliente vinculado a orcamentos ou pedidos.");
    }

    const { error: addressError } = await supabase
      .from("client_addresses")
      .delete()
      .eq("workspace_id", workspace.workspaceId)
      .eq("client_id", id);

    if (addressError) {
      throw new Error(`Falha ao excluir endereco do cliente: ${addressError.message}`);
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspace.workspaceId);

    if (error) {
      throw new Error(`Falha ao excluir cliente: ${error.message}`);
    }

    return { id };
  },
};

export type { ClientSummary };
