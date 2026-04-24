import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    let builder = supabase
      .from("clients")
      .select("id,name,document,state_registration,phone,address,zip_code,city,state")
      .eq("owner_id", user.id)
      .order("name", { ascending: true });

    if (query) {
      builder = builder.or(`name.ilike.%${query}%,document.ilike.%${query}%,city.ilike.%${query}%`);
    }

    const { data, error } = await builder;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar clientes." },
      { status: 500 },
    );
  }
}
