import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/server/errors";
import { quoteService } from "@/server/quote-service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const data = await quoteService.convertToOrder(id);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao converter orcamento em pedido." },
      { status },
    );
  }
}
