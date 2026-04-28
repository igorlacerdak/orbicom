import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const WORKSPACE_COOKIE = "orbicom_workspace_id";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no ambiente.",
  );
}

export const updateSession = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname.startsWith("/auth");
  const isWelcomeRoute = pathname.startsWith("/boas-vindas");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isCompanyPendingRoute = pathname.startsWith("/empresa-em-configuracao");
  const isProtectedPage =
    pathname === "/" ||
    pathname.startsWith("/dev") ||
    pathname.startsWith("/financeiro") ||
    pathname.startsWith("/boas-vindas") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/empresa-em-configuracao") ||
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/orcamentos") ||
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/catalogo") ||
    pathname.startsWith("/pedidos");
  const isProtectedApi =
    pathname.startsWith("/api/dashboard") ||
    pathname.startsWith("/api/finance") ||
    pathname.startsWith("/api/quotes") ||
    pathname.startsWith("/api/companies") ||
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/catalog") ||
    pathname.startsWith("/api/orders") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/workspaces");

  if (!user && (isProtectedPage || isProtectedApi)) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (
    user &&
    isAuthRoute &&
    !pathname.startsWith("/auth/confirm") &&
    !pathname.startsWith("/auth/sign-out") &&
    !pathname.startsWith("/auth/invite")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && !isAuthRoute) {
    const { data: memberships, error: membershipsError } = await supabase
      .from("workspace_members")
      .select("workspace_id,roles")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (membershipsError) {
      if (isProtectedApi) {
        return NextResponse.json({ error: "Falha ao carregar workspaces do usuario." }, { status: 500 });
      }

      return response;
    }

    const activeMemberships = memberships ?? [];

    if (activeMemberships.length === 0) {
      const canUseNoWorkspaceApi =
        pathname.startsWith("/api/workspaces/create") || pathname.startsWith("/api/workspaces/invites/accept");

      if (isProtectedApi && !canUseNoWorkspaceApi) {
        return NextResponse.json({ error: "Sem workspace ativo. Crie ou participe de uma empresa." }, { status: 403 });
      }

      if (!isProtectedApi && !isWelcomeRoute) {
        return NextResponse.redirect(new URL("/boas-vindas", request.url));
      }

      return response;
    }

    const requestedWorkspaceId = request.cookies.get(WORKSPACE_COOKIE)?.value;
    const activeMembership =
      activeMemberships.find((membership) => membership.workspace_id === requestedWorkspaceId) ?? activeMemberships[0];
    const activeWorkspaceId = activeMembership?.workspace_id;
    const activeRoles = Array.isArray(activeMembership?.roles) ? activeMembership.roles : [];
    const canConfigureWorkspace = activeRoles.some((role) => role === "owner" || role === "admin");
    const canAccessFinance = activeRoles.some((role) => role === "owner" || role === "admin" || role === "finance");

    if (isWelcomeRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (pathname.startsWith("/financeiro") && !canAccessFinance) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (pathname.startsWith("/api/finance") && !canAccessFinance) {
      return NextResponse.json({ error: "Sem permissao para acessar financeiro." }, { status: 403 });
    }

    if (activeWorkspaceId && activeWorkspaceId !== requestedWorkspaceId) {
      response.cookies.set(WORKSPACE_COOKIE, activeWorkspaceId, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    const { data: settings } = activeWorkspaceId
      ? await supabase
          .from("workspace_settings")
          .select("onboarding_completed_at")
          .eq("workspace_id", activeWorkspaceId)
          .maybeSingle()
      : { data: null };

    const onboardingCompleted = Boolean(settings?.onboarding_completed_at);

    if (!onboardingCompleted) {
      if (canConfigureWorkspace) {
        if (!isOnboardingRoute && !pathname.startsWith("/api/settings") && !pathname.startsWith("/api/workspaces")) {
          if (isProtectedApi) {
            return NextResponse.json({ error: "Conclua o onboarding do workspace ativo." }, { status: 403 });
          }

          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      } else {
        if (isProtectedApi && !pathname.startsWith("/api/workspaces")) {
          return NextResponse.json({ error: "Workspace em configuracao. Aguarde o onboarding ser concluido." }, { status: 403 });
        }

        if (!isCompanyPendingRoute) {
          return NextResponse.redirect(new URL("/empresa-em-configuracao", request.url));
        }
      }
    }

    if (onboardingCompleted && (isOnboardingRoute || isCompanyPendingRoute)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
};
