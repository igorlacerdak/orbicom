import { NextResponse } from "next/server";

import { clientSchema } from "@/domain/client.schema";
import { ForbiddenError } from "@/server/errors";
import { clientService } from "@/server/client-service";
import { UnauthorizedError } from "@/server/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const data = await clientService.list(query);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar clientes." },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = clientSchema.parse(body);
    const data = await clientService.create(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao cadastrar cliente." },
      { status },
    );
  }
}
