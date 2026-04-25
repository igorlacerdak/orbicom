import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/server/errors";
import { orderService } from "@/server/order-service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const data = await orderService.getById(id);

    if (!data) {
      return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar pedido." },
      { status },
    );
  }
}
