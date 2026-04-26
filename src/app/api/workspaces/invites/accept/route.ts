import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { WORKSPACE_COOKIE } from "@/server/workspace-context";
import { workspaceService } from "@/server/workspace-service";

const payloadSchema = z.object({
  token: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = payloadSchema.parse(body);
    const accepted = await workspaceService.acceptInvite(payload.token);

    const response = NextResponse.json({ data: accepted });
    response.cookies.set(WORKSPACE_COOKIE, accepted.workspaceId, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao aceitar convite." },
      { status },
    );
  }
}
