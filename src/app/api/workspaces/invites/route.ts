import { NextResponse } from "next/server";
import { z } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { workspaceService } from "@/server/workspace-service";

const payloadSchema = z.object({
  email: z.string().email(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = payloadSchema.parse(body);
    const invite = await workspaceService.createInvite(payload);

    return NextResponse.json(
      {
        data: {
          id: invite.id,
          email: invite.email,
          status: invite.status,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
          role: "operator",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar convite." },
      { status },
    );
  }
}
