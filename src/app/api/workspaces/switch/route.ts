import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { WORKSPACE_COOKIE } from "@/server/workspace-context";
import { workspaceService } from "@/server/workspace-service";

const payloadSchema = z.object({
  workspaceId: z.uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = payloadSchema.parse(body);
    const context = await workspaceService.assertMembership(payload.workspaceId);
    const selectedWorkspace = context.workspaces.find((item) => item.id === payload.workspaceId);

    const response = NextResponse.json({
      data: {
        workspaceId: payload.workspaceId,
        name: selectedWorkspace?.name ?? "Workspace",
      },
    });

    response.cookies.set(WORKSPACE_COOKIE, payload.workspaceId, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao trocar workspace." },
      { status },
    );
  }
}
