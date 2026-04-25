import { NextResponse } from "next/server";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { quoteService } from "@/server/quote-service";

export async function GET() {
  try {
    const draft = await quoteService.createDraft();
    return NextResponse.json({ data: draft });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar rascunho." },
      { status },
    );
  }
}
