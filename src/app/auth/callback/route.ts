import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const encodeMessage = (value: string) => encodeURIComponent(value);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = (url.searchParams.get("next") ?? "/dashboard").trim();
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (!code) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("message", encodeMessage("Codigo de autenticacao ausente."));
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("message", encodeMessage("Falha ao concluir login com Google."));
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
