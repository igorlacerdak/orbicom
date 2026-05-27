import { NextResponse } from "next/server";

import { catalogImportSchema } from "@/domain/catalog.schema";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { catalogService } from "@/server/catalog-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = catalogImportSchema.parse(body);
    const data = await catalogService.importBatch(payload.items);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao importar catalogo." },
      { status },
    );
  }
}
