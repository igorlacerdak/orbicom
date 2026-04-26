import { ClientInput } from "@/domain/client.schema";
import { ForbiddenError } from "@/server/errors";
import { hasAnyRole } from "@/server/workspace-context";
import { createClient } from "@/utils/supabase/server";
import { getWorkspaceContext } from "@/server/workspace-context";

type ClientSummary = {
  id: string;
  name: string;
  document: string;
  phone: string;
  city: string;
  state: string;
  updatedAt: string;
};

const normalize = (value: string) => value.trim();

export const clientService = {
  async list(search?: string): Promise<ClientSummary[]> {
    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    const query = normalize(search ?? "");

    let builder = supabase
      .from("clients")
      .select("id,name,document,phone,city,state,updated_at")
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

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      document: row.document,
      phone: row.phone,
      city: row.city,
      state: row.state,
      updatedAt: row.updated_at,
    }));
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
      address: input.address.trim(),
      zip_code: input.zipCode.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("id,name,document,phone,city,state,updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ja existe cliente com esse CPF/CNPJ neste workspace.");
      }

      throw new Error(`Falha ao cadastrar cliente: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      document: data.document,
      phone: data.phone,
      city: data.city,
      state: data.state,
      updatedAt: data.updated_at,
    };
  },
};

export type { ClientSummary };
