import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { financeService } from "@/server/finance-service";

const statusSchema = z.enum(["open", "partial", "paid", "overdue", "cancelled"]);
const paymentMethodSchema = z.enum(["a_vista", "boleto", "pix", "cartao_credito"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const order = searchParams.get("order")?.trim() ?? "";
    const client = searchParams.get("client")?.trim() ?? "";
    const statusesRaw = searchParams.get("statuses")?.trim() ?? "";
    const paymentMethodsRaw = searchParams.get("paymentMethods")?.trim() ?? "";
    const statuses = statusesRaw
      ? statusesRaw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const paymentMethods = paymentMethodsRaw
      ? paymentMethodsRaw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    const parsedStatuses = statuses.map((status) => statusSchema.parse(status));
    const parsedPaymentMethods = paymentMethods.map((method) => paymentMethodSchema.parse(method));

    const data = await financeService.list("receivable", {
      order,
      client,
      statuses: parsedStatuses,
      paymentMethods: parsedPaymentMethods,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar contas a receber." },
      { status },
    );
  }
}
