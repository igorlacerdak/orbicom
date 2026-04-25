import { NextResponse } from "next/server";

import { catalogItemSchema } from "@/domain/catalog.schema";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { catalogService } from "@/server/catalog-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const typeParam = searchParams.get("type");
    const activeParam = searchParams.get("active");
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const type = typeParam === "product" || typeParam === "service" ? typeParam : "all";
    const active = activeParam === null ? undefined : activeParam === "true";
    const minPrice = minPriceParam ? Number(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;

    const data = await catalogService.list({ q, type, active, minPrice, maxPrice });
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar itens do catalogo." },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = catalogItemSchema.parse(body);
    const data = await catalogService.create(payload);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao cadastrar item do catalogo." },
      { status },
    );
  }
}
