import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const { count, error } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao conectar no Supabase.",
      },
      { status: 500 },
    );
  }
}
