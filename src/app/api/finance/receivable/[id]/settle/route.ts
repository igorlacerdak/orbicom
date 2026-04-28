import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { financeService } from "@/server/finance-service";

const settleSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  method: z.string().trim().min(1).max(120).optional(),
  notes: z.string().max(500).optional(),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payload = settleSchema.parse(await request.json());
    await financeService.settleReceivable(id, payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao realizar baixa." },
      { status },
    );
  }
}
