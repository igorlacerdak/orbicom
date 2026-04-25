import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/server/errors";
import { createClient } from "@/utils/supabase/server";
import { getWorkspaceContext } from "@/server/workspace-context";

export async function GET() {
  try {
    const supabase = await createClient();
    const workspace = await getWorkspaceContext();

    const { count, error } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.workspaceId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: {
        ok: true,
        quotesCount: count ?? 0,
      },
    });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao conectar no Supabase.",
      },
      { status },
    );
  }
}
