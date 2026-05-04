import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const encodeMessage = (value: string) => encodeURIComponent(value);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = (url.searchParams.get("next") ?? "/dashboard").trim();
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  const callbackUrl = `${url.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data.url) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set(
      "message",
      encodeMessage(error?.message ?? "Falha ao iniciar login com Google."),
    );
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
