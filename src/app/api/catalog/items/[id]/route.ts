import { NextResponse } from "next/server";

import { catalogItemSchema } from "@/domain/catalog.schema";
import { UnauthorizedError } from "@/server/errors";
import { catalogService } from "@/server/catalog-service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = catalogItemSchema.parse(body);
    const data = await catalogService.update(id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar item do catalogo." },
      { status },
    );
  }
}
