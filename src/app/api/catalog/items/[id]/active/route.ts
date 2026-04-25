import { NextResponse } from "next/server";
import { z } from "zod";

import { UnauthorizedError } from "@/server/errors";
import { catalogService } from "@/server/catalog-service";

const payloadSchema = z.object({
  active: z.boolean(),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = payloadSchema.parse(body);
    const data = await catalogService.setActive(id, payload.active);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar status do item do catalogo." },
      { status },
    );
  }
}
