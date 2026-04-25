import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/server/errors";
import { createClient } from "@/utils/supabase/server";
import { getWorkspaceContext } from "@/server/workspace-context";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    let builder = supabase
      .from("clients")
      .select("id,name,document,state_registration,phone,address,zip_code,city,state,updated_at")
      .eq("workspace_id", workspace.workspaceId)
      .order("name", { ascending: true });

    if (query) {
      builder = builder.or(`name.ilike.%${query}%,document.ilike.%${query}%,city.ilike.%${query}%`);
    }

    const { data, error } = await builder;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        document: row.document,
        phone: row.phone,
        city: row.city,
        state: row.state,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar clientes." },
      { status },
    );
  }
}
