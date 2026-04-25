import { NextResponse } from "next/server";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { workspaceService } from "@/server/workspace-service";

export async function GET() {
  try {
    const data = await workspaceService.getAccessSnapshot();
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar controle de acesso." },
      { status },
    );
  }
}
