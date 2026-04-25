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
};

export type { ClientSummary };
