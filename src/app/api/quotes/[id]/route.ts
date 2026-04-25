import { NextResponse } from "next/server";

import { quoteFormSchema } from "@/domain/quote.schema";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { quoteService } from "@/server/quote-service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const quote = await quoteService.getById(id);

    if (!quote) {
      return NextResponse.json({ error: "Orcamento nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: quote });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar orcamento." },
      { status },
    );
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = quoteFormSchema.parse(body);
    const quote = await quoteService.update(id, payload);

    return NextResponse.json({ data: quote });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar orcamento." },
      { status },
    );
  }
}
