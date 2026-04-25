import { NextResponse } from 'next/server';

import { quoteFormSchema } from '@/domain/quote.schema';
import { ForbiddenError, UnauthorizedError } from '@/server/errors';
import { quoteService } from '@/server/quote-service';

export async function GET() {
  try {
    const quotes = await quoteService.list();
    return NextResponse.json({ data: quotes });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao listar orcamentos.',
      },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = quoteFormSchema.parse(body);
    const quote = await quoteService.create(payload);

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Falha ao criar orcamento.',
      },
      { status },
    );
  }
}
