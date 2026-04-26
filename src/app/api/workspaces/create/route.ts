import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { WORKSPACE_COOKIE } from "@/server/workspace-context";
import { workspaceService } from "@/server/workspace-service";

const payloadSchema = z.object({
  name: z.string().min(2).max(120),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = payloadSchema.parse(body);
    const workspace = await workspaceService.createWorkspace({ name: payload.name });

    const response = NextResponse.json({ data: workspace }, { status: 201 });
    response.cookies.set(WORKSPACE_COOKIE, workspace.workspaceId, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar empresa/workspace." },
      { status },
    );
  }
}
