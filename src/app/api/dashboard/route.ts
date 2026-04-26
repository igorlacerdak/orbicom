import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/server/errors";
import { dashboardService } from "@/server/dashboard-service";

export async function GET() {
  try {
    const data = await dashboardService.getSnapshot();
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar dashboard." },
      { status },
    );
  }
}
