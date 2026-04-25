import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/server/errors";
import { createClient } from "@/utils/supabase/server";
import { getWorkspaceContext } from "@/server/workspace-context";

export async function GET() {
  try {
    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("companies")
      .select("id,name,document,state_registration,phone,address,zip_code,city,state,logo_url")
      .eq("workspace_id", workspace.workspaceId)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar empresas." },
      { status },
    );
  }
}
