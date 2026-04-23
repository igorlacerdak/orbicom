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

    const { data, error } = await supabase
      .from("companies")
      .select("id,name,document,state_registration,phone,address,zip_code,city,state,logo_url")
      .eq("owner_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar empresas." },
      { status: 500 },
    );
  }
}
