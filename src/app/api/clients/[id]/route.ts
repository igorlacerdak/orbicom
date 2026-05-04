import { NextResponse } from "next/server";

import { clientSchema } from "@/domain/client.schema";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { clientService } from "@/server/client-service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = clientSchema.parse(body);
    const data = await clientService.update(id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar cliente." },
      { status },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const data = await clientService.remove(id);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir cliente." },
      { status },
    );
  }
}
