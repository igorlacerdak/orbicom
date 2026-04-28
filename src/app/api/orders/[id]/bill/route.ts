import { NextResponse } from "next/server";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { orderService } from "@/server/order-service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const data = await orderService.bill(id);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao faturar pedido." },
      { status },
    );
  }
}
