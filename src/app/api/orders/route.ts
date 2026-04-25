import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/server/errors";
import { orderService } from "@/server/order-service";

export async function GET() {
  try {
    const data = await orderService.list();
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar pedidos." },
      { status },
    );
  }
}
