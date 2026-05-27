import { NextResponse } from "next/server";

import { pdvSaleSchema } from "@/domain/pdv.schema";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { orderService } from "@/server/order-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = pdvSaleSchema.parse(body);
    const data = await orderService.createFromPdv(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao registrar venda no PDV." },
      { status },
    );
  }
}
