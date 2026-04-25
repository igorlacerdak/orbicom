import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { quoteService } from "@/server/quote-service";

const payloadSchema = z.object({
  status: z.enum(["draft", "sent", "approved", "rejected", "converted"]),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = payloadSchema.parse(body);
    const data = await quoteService.updateStatus(id, payload.status);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar status do orcamento." },
      { status },
    );
  }
}
