import { NextResponse } from "next/server";

import { settingsSchema } from "@/domain/settings.schema";
import { UnauthorizedError } from "@/server/errors";
import { settingsService } from "@/server/settings-service";

export async function GET() {
  try {
    const data = await settingsService.get();
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar configuracoes." },
      { status },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const payload = settingsSchema.parse(body);
    const data = await settingsService.save(payload);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar configuracoes." },
      { status },
    );
  }
}
