import { NextResponse } from "next/server";

import { WORKSPACE_COOKIE } from "@/server/workspace-context";
import { workspaceService } from "@/server/workspace-service";
import { createClient } from "@/utils/supabase/server";

const encodeMessage = (value: string) => encodeURIComponent(value);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") ?? "").trim();

  if (!token) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("message", encodeMessage("Convite invalido."));
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set("message", encodeMessage("Faca login para aceitar o convite."));
    loginUrl.searchParams.set("next", `/auth/invite/accept?token=${encodeURIComponent(token)}`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const accepted = await workspaceService.acceptInvite(token);
    const redirectUrl = new URL("/dashboard", url.origin);
    redirectUrl.searchParams.set("message", encodeMessage(`Convite aceito para ${accepted.workspaceName}.`));

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(WORKSPACE_COOKIE, accepted.workspaceId, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    const loginUrl = new URL("/auth/login", url.origin);
    loginUrl.searchParams.set(
      "message",
      encodeMessage(error instanceof Error ? error.message : "Falha ao aceitar convite."),
    );
    return NextResponse.redirect(loginUrl);
  }
}
